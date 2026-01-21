/**
 * ui.js - UI 管理與渲染 (V15.1)
 */

import { GAME_CONFIG, PIECE_DATA } from './config.js';

export class GameUI
{
    constructor()
    {
        this.SIZE = GAME_CONFIG.BOARD_SIZE;
        this.listeners = {};

        // 圓周長：2 * PI * r (r=45)
        this.CIRCUMFERENCE = 2 * Math.PI * 45;
    }

    on(event, callback) { this.listeners[event] = callback; }

    initBoard()
    {
        const boardEl = document.getElementById('board');
        boardEl.innerHTML = '';
        boardEl.style.gridTemplateColumns = `repeat(${this.SIZE}, 1fr)`;
        boardEl.style.gridTemplateRows = `repeat(${this.SIZE}, 1fr)`;

        for (let r = 0; r < this.SIZE; r++)
        {
            for (let c = 0; c < this.SIZE; c++)
            {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.onclick = () => this.listeners['onCellClick']?.(r, c);
                boardEl.appendChild(cell);
            }
        }

        // 初始化 Timer 為滿的
        this.updateTimer(1, 1);
    }

    render(board)
    {
        const cells = document.querySelectorAll('.cell');
        for (let r = 0; r < this.SIZE; r++)
        {
            for (let c = 0; c < this.SIZE; c++)
            {
                const cell = cells[r * this.SIZE + c];
                cell.innerHTML = '';
                const p = board.getPiece(r, c);
                if (p)
                {
                    const el = document.createElement('div');
                    el.className = `piece ${PIECE_DATA[p.type].class} ${p.p.toLowerCase()}`;
                    el.innerHTML = `<span>${PIECE_DATA[p.type].icon}</span>`;
                    if (p.knightDir)
                    {
                        const dir = document.createElement('div');
                        dir.className = 'dir-hint';
                        dir.innerText = p.knightDir.icon;
                        el.appendChild(dir);
                    }
                    cell.appendChild(el);
                }
            }
        }
    }

    updateRoleIndicator(role)
    {
        const tag = document.getElementById('my-role-tag');
        tag.style.display = 'block';
        if (role === 'PLAYER')
        {
            tag.innerText = "你的陣營：藍方 (先手)";
            tag.className = 'tag-blue';
        } else
        {
            tag.innerText = "你的陣營：紅方 (後手)";
            tag.className = 'tag-red';
        }
    }

    updateCard(hand, handDir, currentTurn)
    {
        const cardEl = document.getElementById('game-card');
        const iconEl = document.getElementById('res-icon');
        const dirEl = document.getElementById('res-dir');
        iconEl.innerText = PIECE_DATA[hand].icon;
        dirEl.innerText = handDir ? handDir.icon : (hand === 'MAGE' ? '✨' : '');

        cardEl.classList.remove('glow-p1', 'glow-p2');
        if (currentTurn === 'PLAYER') cardEl.classList.add('glow-p1');
        else cardEl.classList.add('glow-p2');
    }

    // 🌟 時鐘倒數核心邏輯
    // timeLeft: 剩餘時間 (浮點數)
    // totalTime: 總時間
    updateTimer(timeLeft, totalTime) 
    {
        const bar = document.getElementById('timer-bar');
        if (!bar) return;

        // 計算偏移量
        // 滿的時候 (timeLeft = total) -> offset = 0
        // 空的時候 (timeLeft = 0)     -> offset = CIRCUMFERENCE
        // 透過 scaleX(-1) 翻轉，offset 增加會讓線條看起來順時針消失
        let fraction = timeLeft / totalTime;
        if (fraction < 0) fraction = 0;

        const offset = this.CIRCUMFERENCE * (1 - fraction);
        bar.style.strokeDashoffset = offset;

        // 顏色變化 (剩餘 5 秒變紅)
        if (timeLeft <= 5)
        {
            bar.style.stroke = "var(--timer-warn)";
        } else
        {
            bar.style.stroke = "var(--timer-normal)";
        }
    }

    // updateTurnIndicator(turn, isMyTurn)
    // {
    //     const el = document.getElementById('turn-indicator');
    //     el.innerText = isMyTurn ? "● 你的回合" : "○ 等待對方...";
    //     el.className = turn === 'PLAYER' ? 'turn-my' : 'turn-opp';
    // }

    updateTurnIndicator(turn, isMyTurn)
    {
        const banner = document.getElementById('turn-banner');
        const bannerText = document.getElementById('banner-text');

        // 設定文字內容
        if (isMyTurn)
        {
            bannerText.innerText = "● 你的回合";
        } else
        {
            bannerText.innerText = "○ 等待對手...";
        }

        // 設定背景顏色（只顯示對應陣營的顏色，加上透明度）
        if (turn === 'PLAYER')
        {
            // 藍方：深藍色 + 70% 透明度
            banner.style.background = 'rgba(44, 62, 80, 0.7)';
        } else
        {
            // 紅方：深紅色 + 70% 透明度
            banner.style.background = 'rgba(192, 57, 43, 0.7)';
        }

        // 移除動畫類別，重新觸發
        banner.classList.remove('show');

        // 重新觸發動畫（必須延遲以重新計算）
        setTimeout(() =>
        {
            banner.classList.add('show');
        }, 10);
    }

    setMyId(id) { document.getElementById('my-id').innerText = id; }
    hideLobby() { document.getElementById('lobby-overlay').style.display = 'none'; }
    showLobby() { document.getElementById('lobby-overlay').style.display = 'flex'; }
    showPVPSetup() { document.getElementById('pvp-setup').style.display = 'block'; }
    getInputPeerId() { return document.getElementById('peer-id-input').value.trim().toUpperCase(); }

    showWin(isMe)
    {
        const modal = document.getElementById('win-modal');
        const title = document.getElementById('win-title');
        const desc = document.getElementById('win-desc');

        if (isMe)
        {
            title.innerText = "✨ 你贏了！✨";
            title.style.color = "var(--p1)";
            desc.innerText = "領地成功守護！";
        } else
        {
            title.innerText = "💀 你輸了... 💀";
            title.style.color = "var(--p2)";
            desc.innerText = "領地已失守...";
        }

        modal.classList.add('show');
    }

    hideWin()
    {
        document.getElementById('win-modal').classList.remove('show');
    }

    async showMessage(message, isWarning = false)
    {
        const msgPop = document.getElementById('msg-pop');
        msgPop.innerText = message;

        if (isWarning)
        {
            msgPop.style.borderColor = "#ff4757";
            msgPop.style.color = "#ff4757";
        } else
        {
            msgPop.style.borderColor = "rgba(255,235,59,0.3)";
            msgPop.style.color = "var(--accent)";
        }

        msgPop.style.opacity = '1';

        await new Promise(res => setTimeout(() =>
        {
            msgPop.style.opacity = '0';
            res();
        }, 800));
    }
}