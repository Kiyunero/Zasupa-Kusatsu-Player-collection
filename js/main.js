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
        // 広告動画の音量を戻し、再生する
        adVideo.volume = 1.0;
        adVideo.play();
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
            bgmPlayer.play();
        }

        let volume = 1.0;
        const fadeOut = setInterval(() => {
            if (volume > 0.1) {
                volume -= 0.1;
                adVideo.volume = volume;
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
            try {
                const response = await fetch(gasUrl);
                if (!response.ok) {
                    throw new Error('選手データの取得に失敗しました。');
                }
                const data = await response.json();
                this.header = data.header;
                this.players = this.processPlayerData(data.players);
            } catch (error) {
                console.error(error);
                console.log('データの取得に失敗したため、開発用のダミーデータを読み込みます。');
                this.loadDummyData();
            } finally {
                this.isLoading = false;
            }
        },
        processPlayerData(players) {
            return players.map(player => {
                const coords = FORMATION_COORDS[player.position] || FORMATION_COORDS['DEFAULT'];
                const stats = {
                    speed: Math.floor(Math.random() * 61) + 40,
                    power: Math.floor(Math.random() * 61) + 40,
                    technique: Math.floor(Math.random() * 61) + 40,
                    defense: Math.floor(Math.random() * 61) + 40,
                    stamina: Math.floor(Math.random() * 61) + 40,
                };
                return { ...player, pitch_x: coords.x, pitch_y: coords.y, stats };
            });
        },
        loadDummyData() {
            this.header = { title: "ザスパ群馬 選手名鑑", description: "2025シーズンのメンバー紹介...", image: "https://www.thespa.co.jp/assets/img/logo_thespa.png" };
            const dummyPlayers = [];
            this.players = this.processPlayerData(dummyPlayers);
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

            // ★★★★★ 修正点 ★★★★★
            // アニメーションが終わるのを待ってからグラフを破壊する
            setTimeout(() => {
                if (this.chartInstance) {
                    this.chartInstance.destroy();
                    this.chartInstance = null;
                }
            }, 500); // cssの`transition: opacity 0.5s ease;` に合わせる

            setTimeout(() => {
                this.pitchStyle = { transform: 'scale(1) translate(0, 0)' };
                this.currentPlayer = null;
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