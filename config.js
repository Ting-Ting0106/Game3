/**
 * config.js - 遊戲全域參數配置
 */
export const GAME_CONFIG = {
    BOARD_SIZE: 10,      // 棋盤大小 (10x10)
    WIN_COUNT: 5,        // 五子連線獲勝
    ANIMATION_DELAY: 400, // 動播延遲時間 (ms)
    TURN_TIME_LIMIT: 15,  // 每回合思考時間 (秒)
};

// 棋子類型與對應圖示
export const PIECE_DATA = {
    LORD: { icon: '🏰', class: 'lord' },     // 領主：核心棋子
    KNIGHT: { icon: '🐎', class: 'knight' }, // 騎士：直線衝鋒
    MAGE: { icon: '🧙', class: 'mage' },   // 法師：感化鄰居
};

// 騎士移動方向配置
export const DIRECTIONS = [
    { dr: -1, dc: 0, icon: '⬆️', name: 'up' },
    { dr: 1, dc: 0, icon: '⬇️', name: 'down' },
    { dr: 0, dc: -1, icon: '⬅️', name: 'left' },
    { dr: 0, dc: 1, icon: '➡️', name: 'right' },
];

// PeerJS 連線伺服器配置
export const PEER_CONFIG = {
    host: '0.peerjs.com',
    port: 443,
    path: '/',
    secure: true,
    config: {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    }
};