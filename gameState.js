/**
 * gameState.js - 負責追蹤回合、抽牌邏輯與遊戲開關
 */
export class GameState
{
    constructor()
    {
        this.reset();
    }

    // 切換玩家回合
    changeTurn()
    {
        this.turn = this.turn === 'PLAYER' ? 'AI' : 'PLAYER';
    }

    // 隨機產生下一張手牌
    generateRandomHand(dirs)
    {
        const r = Math.random() * 100;
        if (r < 20)
        { // 20% 機率抽到法師
            this.hand = 'MAGE';
            this.handDir = null;
        } else if (r < 35)
        { // 15% 機率抽到騎士
            this.hand = 'KNIGHT';
            this.handDir = dirs[Math.floor(Math.random() * dirs.length)];
        } else
        { // 65% 機率抽到領主
            this.hand = 'LORD';
            this.handDir = null;
        }
    }

    // 初始化狀態
    reset()
    {
        this.turn = 'PLAYER';      // 預設玩家先手
        this.hand = 'LORD';        // 起始手牌固定為領主
        this.handDir = null;
        this.isOver = false;       // 遊戲結束標記
        this.isProcessing = false; // 技能執行中的鎖定標記
    }
}