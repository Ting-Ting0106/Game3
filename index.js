/**
 * index.js - 主邏輯 (V15.2 跑條強化版)
 */

import { GameConnection } from './connection.js';
import { GameState } from './gameState.js';
import { Board } from './board.js';
import { SkillSystem } from './skills.js';
import { AIPlayer } from './ai.js';
import { GameUI } from './ui.js';
import { DIRECTIONS, GAME_CONFIG } from './config.js';

class Game
{
    constructor()
    {
        this.connection = new GameConnection();
        this.gameState = new GameState();
        this.board = new Board();
        this.skillSystem = new SkillSystem(this.board);
        this.aiPlayer = new AIPlayer(this.board);
        this.ui = new GameUI();

        this.isAI = false;
        this.myRole = 'PLAYER';
        this.timer = null;
        this.currentTimer = 0;

        this.setupListeners();
    }

    setupListeners()
    {
        window.showPVP = () => { this.ui.showPVPSetup(); this.connection.initPeer(); };
        window.startAI = () => { this.isAI = true; this.startGame(); };
        window.connectToFriend = () =>
        {
            const id = this.ui.getInputPeerId();
            this.connection.connectToFriend(id).then(() => this.startGame());
        };

        window.copyID = () =>
        {
            const id = document.getElementById('my-id').innerText;
            if (id && id !== '生成中...')
            {
                navigator.clipboard.writeText(id);
                this.ui.showMessage('代碼已複製');
            }
        };

        window.rematch = () => this.handleRematch();
        window.goBackToLobby = () => location.reload();

        this.ui.on('onCellClick', (r, c) => this.handleMove(r, c));
        this.connection.on('onConnected', (id) => this.ui.setMyId(id));
        this.connection.on('onData', (d) => this.handleRemoteData(d));
    }

    startGame()
    {
        // 如果是 AI 模式，強制設定玩家為 PLAYER
        if (this.isAI)
        {
            this.myRole = 'PLAYER';
        } else
        {
            this.myRole = this.connection.myRole;
        }

        this.ui.hideWin();
        this.ui.hideLobby();
        this.ui.initBoard();
        this.ui.updateRoleIndicator(this.myRole);
        this.prepareTurn();
    }

    handleRematch()
    {
        if (!this.isAI && this.connection && this.connection.conn)
        {
            this.connection.send({ type: 'REMATCH' });
        }

        // 額外確保重開時狀態乾淨
        this.resetAndRestart();
    }

    resetAndRestart()
    {
        this.stopTimer();
        this.board.initBoard(); // 確保調用 initBoard 清空二維陣列
        this.gameState.reset();

        // 重新設定為非處理狀態
        this.gameState.isProcessing = false;

        this.ui.hideWin();
        this.ui.initBoard(); // 重新畫 DOM
        this.ui.render(this.board);
        this.prepareTurn();
    }

    async prepareTurn()
    {
        if (this.gameState.isOver) return;

        this.gameState.isProcessing = false;
        const isMyTurn = (this.gameState.turn === this.myRole);
        this.ui.updateTurnIndicator(this.gameState.turn, isMyTurn);

        // 生成手牌與同步
        if (isMyTurn || (this.isAI && this.gameState.turn === 'AI'))
        {
            this.gameState.generateRandomHand(DIRECTIONS);
            this.ui.updateCard(this.gameState.hand, this.gameState.handDir, this.gameState.turn);

            if (!this.isAI && isMyTurn)
            {
                this.connection.send({ type: 'SYNC', hand: this.gameState.hand, dir: this.gameState.handDir });
            }
        }

        // --- 修正點 1: 無論玩家或 AI 回合都要啟動計時跑條 ---
        this.startTimer();

        if (this.isAI && this.gameState.turn === 'AI')
        {
            this.gameState.isProcessing = true;
            // 給予短暫延遲讓玩家看清楚 AI 的手牌
            await new Promise(r => setTimeout(r, 1000));
            const move = this.aiPlayer.chooseAction(this.gameState.hand, this.gameState.handDir, 'AI');
            this.executeMove(move.r, move.c, 'AI');
        }
    }

    startTimer()
    {
        this.stopTimer();
        this.currentTimer = GAME_CONFIG.TURN_TIME_LIMIT;

        // 初始化跑條（回到 12 點鐘位置滿格狀態）
        this.ui.updateTimer(this.currentTimer, GAME_CONFIG.TURN_TIME_LIMIT);

        this.timer = setInterval(() =>
        {
            this.currentTimer -= 0.1;

            // 更新 UI 跑條
            this.ui.updateTimer(this.currentTimer, GAME_CONFIG.TURN_TIME_LIMIT);

            if (this.currentTimer <= 0)
            {
                this.stopTimer();
                this.handleTimeout();
            }
        }, 100);
    }

    stopTimer()
    {
        if (this.timer)
        {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    handleMove(r, c)
    {
        if (this.gameState.isOver || this.gameState.isProcessing) return;
        if (this.gameState.turn !== this.myRole) return;

        if (this.currentTimer <= 0) return;
        if (this.board.hasPiece(r, c)) return;

        this.gameState.isProcessing = true;
        this.executeMove(r, c, this.myRole);
    }

    async handleTimeout()
    {
        if (this.gameState.isProcessing || this.gameState.isOver) return;
        this.gameState.isProcessing = true;

        // 時間到，UI 訊息提示
        this.ui.showMessage("⏰ 時間超時！由 AI 代打", true);

        await new Promise(r => setTimeout(r, 500));

        // 超時處理同樣會調用 executeMove，進而觸發跑條重置
        const move = this.aiPlayer.chooseAction(this.gameState.hand, this.gameState.handDir, this.gameState.turn);
        this.executeMove(move.r, move.c, this.gameState.turn);
    }

    async executeMove(r, c, p)
    {
        // --- 修正點 2: 有動作後立即停止計時並將跑條歸位到 12 點鐘 ---
        this.stopTimer();
        this.ui.updateTimer(GAME_CONFIG.TURN_TIME_LIMIT, GAME_CONFIG.TURN_TIME_LIMIT);

        if (p === this.myRole && !this.isAI)
        {
            this.connection.send({ type: 'MOVE', r, c, hand: this.gameState.hand, dir: this.gameState.handDir });
        }

        this.board.placePiece(r, c, { p, type: this.gameState.hand, knightDir: this.gameState.handDir });
        this.ui.render(this.board);

        await new Promise(r => setTimeout(r, 300));
        while (await this.skillSystem.checkAndTriggerSkills(m => this.ui.showMessage(m)))
        {
            this.ui.render(this.board);
            await new Promise(r => setTimeout(r, 300));
        }

        if (this.board.checkWin(p))
        {
            this.gameState.isOver = true;
            this.ui.showWin(p === this.myRole);
            return;
        }

        this.gameState.changeTurn();
        this.prepareTurn();
    }

    handleRemoteData(d)
    {
        if (d.type === 'REMATCH')
        {
            this.ui.showMessage("小方發起了重新對戰");
            this.resetAndRestart();
            return;
        }

        if (this.gameState.isOver) return;

        if (d.type === 'SYNC')
        {
            this.gameState.hand = d.hand;
            this.gameState.handDir = d.dir;
            this.ui.updateCard(d.hand, d.dir, this.gameState.turn);
        } else if (d.type === 'MOVE')
        {
            this.gameState.isProcessing = true;
            this.gameState.hand = d.hand;
            this.gameState.handDir = d.dir;
            this.executeMove(d.r, d.c, this.gameState.turn);
        }
    }
}

new Game();