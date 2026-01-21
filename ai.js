/**
 * ai.js - 強化版 AI 玩家邏輯 (V3.1 - 防守與功能棋優化)
 */

import { GAME_CONFIG } from './config.js';

export class AIPlayer
{
    constructor(board)
    {
        this.board = board;
        this.SIZE = GAME_CONFIG.BOARD_SIZE;
    }

    chooseAction(hand, handDir, aiRole)
    {
        const opponentRole = aiRole === 'AI' ? 'PLAYER' : 'AI';
        let bestScore = -Infinity;
        let bestMoves = [];

        for (let r = 0; r < this.SIZE; r++)
        {
            for (let c = 0; c < this.SIZE; c++)
            {
                if (this.board.hasPiece(r, c)) continue;

                let score = this.evaluateHypotheticalMove(r, c, hand, handDir, aiRole, opponentRole);

                // 基礎中心加權 (維持輕微影響)
                const distToCenter = Math.abs(r - 4.5) + Math.abs(c - 4.5);
                score += (this.SIZE - distToCenter) * 2;

                // 隨機因子
                score += Math.random() * 5;

                if (score > bestScore)
                {
                    bestScore = score;
                    bestMoves = [{ r, c }];
                } else if (score === bestScore)
                {
                    bestMoves.push({ r, c });
                }
            }
        }

        return bestMoves.length > 0
            ? bestMoves[Math.floor(Math.random() * bestMoves.length)]
            : { r: 5, c: 5 };
    }

    evaluateHypotheticalMove(r, c, hand, handDir, me, opp)
    {
        const virtualGrid = this.cloneGrid(this.board.grid);
        virtualGrid[r][c] = { p: me, type: hand, knightDir: handDir };

        // 模擬技能觸發後的狀態
        this.simulateSkills(virtualGrid, me);

        // 1️⃣ 勝利檢查：我這步下完直接贏了
        if (this.checkWinInGrid(virtualGrid, me)) return 9000000;

        // 2️⃣ 危機檢查：如果我不下這格，對手下在這裡會贏
        // 這能處理：對手四連線，我必須擋住/破壞
        if (this.isCriticalDefensiveSpot(r, c, me, opp)) return 8000000;

        let totalScore = 0;

        // 3️⃣ 功能棋特有評估
        if (hand === 'MAGE')
        {
            const convertedCount = this.countConvertedLords(this.board.grid, virtualGrid, me);
            // 如果轉化掉對手的高威脅棋子，加分
            totalScore += convertedCount * 15000;
        }

        if (hand === 'KNIGHT' && handDir)
        {
            const removedCount = this.countRemovedLords(this.board.grid, virtualGrid, opp);
            // 如果殺掉對手的高威脅棋子，加分
            totalScore += removedCount * 12000;
        }

        // 4️⃣ 基礎連線評估
        totalScore += this.evaluateGrid(virtualGrid, me, opp);

        return totalScore;
    }

    // 判斷 (r, c) 是否為必須防守的關鍵點
    isCriticalDefensiveSpot(r, c, me, opp)
    {
        // 模擬對手在該位置下一個領主
        const testGrid = this.cloneGrid(this.board.grid);
        testGrid[r][c] = { p: opp, type: 'LORD', knightDir: null };

        // 如果對手下這格就贏了，那這格對我來說就是必須佔領或破壞的點
        return this.checkWinInGrid(testGrid, opp);
    }

    evaluateGrid(grid, me, opp)
    {
        let score = 0;
        for (let r = 0; r < this.SIZE; r++)
        {
            for (let c = 0; c < this.SIZE; c++)
            {
                const p = grid[r][c];
                // ⚠️ 重點：只有領主參與五子棋連線評分
                if (p && p.type === 'LORD')
                {
                    const val = this.evaluatePoint(grid, r, c, p.p);
                    if (p.p === me) score += val;
                    else score -= val * 20; // 提高對手連線的警覺性
                }
            }
        }
        return score;
    }

    evaluatePoint(grid, r, c, player)
    {
        const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
        let score = 0;

        for (const [dr, dc] of dirs)
        {
            let count = 1;
            let blocked = 0;

            for (const sig of [1, -1])
            {
                for (let i = 1; i < 5; i++)
                {
                    const nr = r + dr * i * sig;
                    const nc = c + dc * i * sig;

                    if (this.isIn(nr, nc))
                    {
                        const p = grid[nr][nc];
                        if (p?.p === player && p?.type === 'LORD')
                        {
                            count++;
                        } else if (p)
                        {
                            blocked++;
                            break;
                        } else break;
                    } else
                    {
                        blocked++;
                        break;
                    }
                }
            }

            // 重新定義評分梯度，讓 AI 更怕四連
            if (count >= 5) score += 100000;
            else if (count === 4) score += (blocked === 0) ? 10000 : 2000;
            else if (count === 3) score += (blocked === 0) ? 1000 : 200;
            else if (count === 2) score += 50;
        }
        return score;
    }

    // --- 以下為輔助與模擬函數，保持邏輯嚴密 ---

    simulateSkills(grid, currentMover)
    {
        let changed = true;
        let limit = 10;
        while (changed && limit-- > 0)
        {
            changed = false;
            for (let r = 0; r < this.SIZE; r++)
            {
                for (let c = 0; c < this.SIZE; c++)
                {
                    const p = grid[r][c];
                    if (!p) continue;

                    if (p.type === 'KNIGHT' && p.knightDir)
                    {
                        const tr = r + p.knightDir.dr, tc = c + p.knightDir.dc;
                        if (this.isIn(tr, tc) && grid[tr][tc] && grid[tr][tc].p !== p.p)
                        {
                            grid[tr][tc] = null;
                            grid[r][c] = null;
                            changed = true;
                        }
                    }

                    if (p.type === 'MAGE')
                    {
                        let converted = false;
                        for (const [dr, dc] of [[0, -1], [0, 1]])
                        {
                            const tr = r + dr, tc = c + dc;
                            if (this.isIn(tr, tc) && grid[tr][tc] && grid[tr][tc].p !== p.p)
                            {
                                grid[tr][tc].p = p.p;
                                converted = true;
                                changed = true;
                            }
                        }
                        if (converted) grid[r][c] = null;
                    }
                }
            }
        }
    }

    isIn(r, c) { return r >= 0 && r < this.SIZE && c >= 0 && c < this.SIZE; }
    cloneGrid(grid) { return grid.map(row => row.map(cell => cell ? { ...cell } : null)); }

    countConvertedLords(oldGrid, newGrid, me)
    {
        let count = 0;
        for (let r = 0; r < this.SIZE; r++)
        {
            for (let c = 0; c < this.SIZE; c++)
            {
                if (oldGrid[r][c]?.type === 'LORD' && oldGrid[r][c]?.p !== me && newGrid[r][c]?.p === me) count++;
            }
        }
        return count;
    }

    countRemovedLords(oldGrid, newGrid, opp)
    {
        let count = 0;
        for (let r = 0; r < this.SIZE; r++)
        {
            for (let c = 0; c < this.SIZE; c++)
            {
                if (oldGrid[r][c]?.type === 'LORD' && oldGrid[r][c]?.p === opp && !newGrid[r][c]) count++;
            }
        }
        return count;
    }

    checkWinInGrid(grid, player)
    {
        for (let r = 0; r < this.SIZE; r++)
        {
            for (let c = 0; c < this.SIZE; c++)
            {
                const p = grid[r][c];
                if (p?.p === player && p?.type === 'LORD' && this.checkFiveInGrid(grid, r, c, player)) return true;
            }
        }
        return false;
    }

    checkFiveInGrid(grid, r, c, player)
    {
        const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
        return dirs.some(([dr, dc]) =>
        {
            let count = 1;
            for (let sig of [1, -1])
            {
                for (let i = 1; i < 5; i++)
                {
                    const nr = r + dr * i * sig, nc = c + dc * i * sig;
                    const p = this.isIn(nr, nc) ? grid[nr][nc] : null;
                    if (p?.p === player && p?.type === 'LORD') count++;
                    else break;
                }
            }
            return count >= 5;
        });
    }
}