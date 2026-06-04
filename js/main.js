// --- 広告画面関連のロジック ---

// 変数の宣言
let adScreen, mainContent, adVideo, bgmPlayer;

/**
 * メインコンテンツを非表示にし、広告画面を表示する関数
 */
function goToAdScreen() {
    if (mainContent && adScreen && adVideo) {
        // メインコンテンツを隠す
        mainContent.classList.add('hidden');
        // 広告画面を表示する
        adScreen.style.display = 'block';
        // 広告動画の音量を戻し、再生する（自動再生ポリシーで弾かれた場合に備えてミュートにフォールバック）
        adVideo.volume = 1.0;
        const playPromise = adVideo.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
                adVideo.muted = true;
                adVideo.play().catch(() => {});
            });
        }
        // BGMを停止し、再生位置を最初に戻す
        if (bgmPlayer) {
            bgmPlayer.pause();
            bgmPlayer.currentTime = 0;
        }
        // Vueアプリの表示状態をリセットする（プロフィール等）
        if (window.vueApp && typeof window.vueApp.resetViewState === 'function') {
            window.vueApp.resetViewState();
        }
    }
}

// HTMLのDOM読み込み完了後に実行されるイベントリスナー
document.addEventListener('DOMContentLoaded', () => {
    // HTML要素を取得して変数に格納
    adScreen = document.getElementById('ad-screen');
    mainContent = document.getElementById('main-content');
    adVideo = document.getElementById('ad-video');
    bgmPlayer = document.getElementById('bgm-player');

    // 再生する広告動画のリスト
    const adVideos = [
        'https://firebasestorage.googleapis.com/v0/b/pilgrimage-quest-app.firebasestorage.app/o/zasupa.mp4?alt=media&token=556b61e5-1a3f-4983-b9b2-ffc8adc00a59',
    ];
    let currentVideoIndex = 0;

    // 動画が終了したら次の動画を再生する
    adVideo.addEventListener('ended', () => {
        currentVideoIndex = (currentVideoIndex + 1) % adVideos.length;
        adVideo.src = adVideos[currentVideoIndex];
        adVideo.play();
    });
    // 最初の動画をセット
    adVideo.src = adVideos[0];

    // 無操作タイマーの変数
    let inactivityTimer;
    // 無操作とみなす時間（ミリ秒）90000ms = 90秒
    const inactivityTimeout = 90000;

    /**
     * 無操作タイマーをリセットする関数
     */
    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(goToAdScreen, inactivityTimeout);
    }

    // メインコンテンツ上での操作（クリック、タッチ、スクロール）でタイマーをリセット
    mainContent.addEventListener('click', resetInactivityTimer);
    mainContent.addEventListener('touchstart', resetInactivityTimer);
    mainContent.addEventListener('wheel', resetInactivityTimer, { passive: true });

    // 広告画面がクリックされた時の処理
    adScreen.addEventListener('click', () => {
        adScreen.style.display = 'none';
        mainContent.classList.remove('hidden');
        resetInactivityTimer();

        if (bgmPlayer) {
            bgmPlayer.volume = 0.3;
            const bgmPromise = bgmPlayer.play();
            if (bgmPromise && typeof bgmPromise.catch === 'function') {
                bgmPromise.catch(() => {});
            }
        }

        // 広告動画は一旦アンミュートしてからフェードアウトさせる
        adVideo.muted = false;
        let volume = 1.0;
        const fadeOut = setInterval(() => {
            if (volume > 0.1) {
                volume -= 0.1;
                adVideo.volume = Math.max(volume, 0);
            } else {
                adVideo.pause();
                clearInterval(fadeOut);
            }
        }, 100);
    });
});


// --- Vue.jsアプリケーション本体のロジック ---

// --- 選手アイコンの座標定義 ---
const LINE_Y = { FW: 58, AMF: 63, CMF: 69, WB: 69, CB: 75, GK: 82, };
const LANE_X = { CENTER: 52, LEFT_CB: 32, RIGHT_CB: 72, LEFT_HALF: 42, RIGHT_HALF: 62, WING_LEFT: 20, WING_RIGHT: 84, };
const FORMATION_COORDS = { 'GK': { x: LANE_X.CENTER, y: LINE_Y.GK }, 'LCB': { x: LANE_X.LEFT_CB, y: LINE_Y.CB }, 'CB': { x: LANE_X.CENTER, y: LINE_Y.CB }, 'RCB': { x: LANE_X.RIGHT_CB, y: LINE_Y.CB }, 'LWB': { x: LANE_X.WING_LEFT, y: LINE_Y.WB }, 'RWB': { x: LANE_X.WING_RIGHT, y: LINE_Y.WB }, 'LCM': { x: LANE_X.LEFT_HALF, y: LINE_Y.CMF }, 'RCM': { x: LANE_X.RIGHT_HALF, y: LINE_Y.CMF }, 'LAM': { x: LANE_X.LEFT_HALF, y: LINE_Y.AMF }, 'RAM': { x: LANE_X.RIGHT_HALF, y: LINE_Y.AMF }, 'ST': { x: LANE_X.CENTER, y: LINE_Y.FW }, 'DEFAULT': { x: 50, y: 50 }, };


// Vueアプリケーションのインスタンスを作成
const app = Vue.createApp({
    data() {
        return {
            isLoading: true,
            header: null,
            players: [],
            isHeaderExpanded: false,
            pitchStyle: {},
            currentPlayer: null,
            isProfileVisible: false,
            defaultPlayerIcon: 'images/default-icon.png',
            chartInstance: null,
            profileTimeoutId: null,
            chartDestroyTimeoutId: null,
            pitchResetTimeoutId: null,
        };
    },
    mounted() {
        this.fetchPlayers();
    },
    methods: {
        handleBackToAdClick() {
            goToAdScreen();
        },
        async fetchPlayers() {
            // GAS の URL が無効、もしくは file:// プロトコルなど fetch が使えない環境ならローカルデータへ
            const canFetch =
                typeof gasUrl === 'string' &&
                gasUrl.startsWith('http') &&
                typeof window.fetch === 'function' &&
                location.protocol !== 'file:';

            if (canFetch) {
                try {
                    const response = await fetch(gasUrl);
                    if (!response.ok) {
                        throw new Error('選手データの取得に失敗しました。HTTP ' + response.status);
                    }
                    const data = await response.json();
                    if (data && Array.isArray(data.players) && data.players.length > 0) {
                        this.header = data.header || null;
                        this.players = this.processPlayerData(data.players);
                        this.isLoading = false;
                        return;
                    }
                    throw new Error('取得した選手データが空です。');
                } catch (error) {
                    console.warn('リモートデータの取得に失敗したため、ローカルのデータを読み込みます。', error);
                }
            } else {
                console.info('fetch が利用できない環境のため、ローカルのデータを読み込みます。');
            }
            this.loadDummyData();
            this.isLoading = false;
        },
        processPlayerData(players) {
            // 同一選手 / リロード時の表示ブレを防ぐため、id をシードにした擬似乱数で能力値を生成する
            const seededRandom = (seed) => {
                let s = (seed * 9301 + 49297) % 233280;
                return () => {
                    s = (s * 9301 + 49297) % 233280;
                    return s / 233280;
                };
            };
            return players.map((player, index) => {
                const coords = FORMATION_COORDS[player.position] || FORMATION_COORDS['DEFAULT'];
                const rand = seededRandom((player.id || index + 1) * 31);
                const stats = {
                    speed: Math.floor(rand() * 61) + 40,
                    power: Math.floor(rand() * 61) + 40,
                    technique: Math.floor(rand() * 61) + 40,
                    defense: Math.floor(rand() * 61) + 40,
                    stamina: Math.floor(rand() * 61) + 40,
                };
                return { ...player, pitch_x: coords.x, pitch_y: coords.y, stats };
            });
        },
        loadDummyData() {
            // data.js で定義された localData を使う（読み込まれていない場合のセーフネットも用意）
            const fallback = (typeof localData !== 'undefined' && localData)
                ? localData
                : {
                    header: {
                        title: "ザスパ群馬 選手名鑑",
                        description: "選手データを読み込めませんでした。",
                        image: ""
                    },
                    players: []
                };
            this.header = fallback.header || null;
            this.players = this.processPlayerData(fallback.players || []);
        },
        onPlayerClick(player) {
            if (this.isProfileVisible && this.currentPlayer?.id === player.id) {
                this.hideProfile();
                return;
            }
            if (this.isProfileVisible) {
                this.hideProfile();
                setTimeout(() => {
                    this.showProfile(player);
                }, 600);
            } else {
                this.showProfile(player);
            }
        },
        showProfile(player) {
            if (this.profileTimeoutId) {
                clearTimeout(this.profileTimeoutId);
                this.profileTimeoutId = null;
            }
            if (this.chartDestroyTimeoutId) {
                clearTimeout(this.chartDestroyTimeoutId);
                this.chartDestroyTimeoutId = null;
            }
            if (this.pitchResetTimeoutId) {
                clearTimeout(this.pitchResetTimeoutId);
                this.pitchResetTimeoutId = null;
            }

            const scale = 1.5;
            const translateX = (50 - player.pitch_x) * scale;
            const translateY = (50 - player.pitch_y) * scale;
            this.pitchStyle = { transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)` };
            this.currentPlayer = player;

            this.profileTimeoutId = setTimeout(() => {
                this.isProfileVisible = true;
                this.$nextTick(() => {
                    this.createRadarChart(player);
                });
            }, 300);
        },
        hideProfile() {
            if (this.profileTimeoutId) {
                clearTimeout(this.profileTimeoutId);
                this.profileTimeoutId = null;
            }
            this.isProfileVisible = false;

            // アニメーション (opacity 0.5s) が終わってからチャートを破棄する
            if (this.chartDestroyTimeoutId) {
                clearTimeout(this.chartDestroyTimeoutId);
            }
            this.chartDestroyTimeoutId = setTimeout(() => {
                if (this.chartInstance) {
                    try { this.chartInstance.destroy(); } catch (e) { /* noop */ }
                    this.chartInstance = null;
                }
                this.chartDestroyTimeoutId = null;
            }, 500);

            if (this.pitchResetTimeoutId) {
                clearTimeout(this.pitchResetTimeoutId);
            }
            this.pitchResetTimeoutId = setTimeout(() => {
                this.pitchStyle = { transform: 'scale(1) translate(0, 0)' };
                this.currentPlayer = null;
                this.pitchResetTimeoutId = null;
            }, 300);
        },
        resetViewState() {
            this.hideProfile();
        },
        createRadarChart(player) {
            if (this.chartInstance) {
                this.chartInstance.destroy();
            }
            const canvas = document.getElementById('radarChart');
            if (!canvas) return; // canvasが存在しない場合は処理を中断

            const ctx = canvas.getContext('2d');
            const stats = player.stats; 

            this.chartInstance = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: ['SP', 'PW', 'TC', 'DF', 'ST'],
                    datasets: [{
                        label: player.name,
                        data: [stats.speed, stats.power, stats.technique, stats.defense, stats.stamina],
                        fill: true,
                        backgroundColor: 'rgba(0, 191, 255, 0.2)',
                        borderColor: 'rgba(255, 255, 255, 0.58)',
                        pointBackgroundColor: 'rgb(255, 255, 255)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgb(255, 255, 255)'
                    }]
                },
                options: {
                    animation: {
                        duration: 2000,
                        easing: 'easeInOutQuint'
                    },
                    scales: {
                        r: {
                            min: 0,
                            max: 100,
                            ticks: {
                                stepSize: 18,
                                display: false,
                            },
                            backgroundColor: 'rgba(0,0,0,0.2)',
                            grid: { color: 'rgba(0, 191, 255, 0.2)' },
                            angleLines: { color: 'rgba(0, 191, 255, 0.2)' },
                            pointLabels: {
                                color: '#fff',
                                font: { size: 16, family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif" }
                            }
                        }
                    },
                    plugins: {
                        legend: { display: false }
                    },
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    }
});
window.vueApp = app.mount('#app');