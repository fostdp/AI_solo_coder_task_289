const canvasWidth = 500;
const canvasHeight = 380;
const padding = 60;

let currentTab = 'pb-sn';
let currentExercise = null;
let coolingAnimationId = null;
let isCooling = false;
let lastAnimationFrameTime = 0;
const ANIMATION_THROTTLE = 32;

function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
            currentTab = btn.dataset.tab;
            if (currentTab === 'fe-c') drawFeCDiagram();
            if (currentTab === 'ttt') drawTTTDiagram();
            if (currentTab === 'lever') drawLeverDiagram();
            if (currentTab === 'hardness') updateHardnessPrediction();
        });
    });
}

function initDiagramSelectors() {
    document.querySelectorAll('.diagram-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.diagram-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (btn.dataset.type) drawLeverDiagram(btn.dataset.type);
        });
    });
}

function compToX(comp, minComp, maxComp) {
    return padding + (comp - minComp) / (maxComp - minComp) * (canvasWidth - 2 * padding);
}

function tempToY(temp, minTemp, maxTemp) {
    return canvasHeight - padding - (temp - minTemp) / (maxTemp - minTemp) * (canvasHeight - 2 * padding);
}

function xToComp(x, minComp, maxComp) {
    return minComp + (x - padding) / (canvasWidth - 2 * padding) * (maxComp - minComp);
}

function yToTemp(y, minTemp, maxTemp) {
    return minTemp + (canvasHeight - padding - y) / (canvasHeight - 2 * padding) * (maxTemp - minTemp);
}

const pbSnData = {
    meltingPointPb: 327.5,
    meltingPointSn: 231.9,
    eutecticTemp: 183,
    eutecticComp: 61.9,
    maxSolubilityAlpha: 19,
    maxSolubilityBeta: 97.5,
    roomTempSolubilityAlpha: 2,
    minTemp: 100,
    maxTemp: 350,
    minComp: 0,
    maxComp: 100
};

let pbSnCurrent = { temp: 200, comp: 50, phaseInfo: null };

function drawPhaseDiagram() {
    const canvas = document.getElementById('phaseDiagram');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    drawGrid(ctx, pbSnData.minTemp, pbSnData.maxTemp, pbSnData.minComp, pbSnData.maxComp, 50, 20);
    
    const { eutecticTemp, eutecticComp, maxSolubilityAlpha, maxSolubilityBeta, meltingPointPb, meltingPointSn } = pbSnData;
    
    drawPhaseRegion(ctx, [[eutecticComp, eutecticTemp], [100, 231.9], [100, eutecticTemp]], '#ff6b6b', 0.3);
    drawPhaseRegion(ctx, [[0, 327.5], [eutecticComp, eutecticTemp], [maxSolubilityAlpha, eutecticTemp], [0, eutecticTemp]], '#ff6b6b', 0.3);
    drawPhaseRegion(ctx, [[0, 327.5], [eutecticComp, eutecticTemp], [maxSolubilityAlpha, eutecticTemp], [0, eutecticTemp], [0, 100], [2, 100]], '#4ecdc4', 0.4);
    drawPhaseRegion(ctx, [[eutecticComp, eutecticTemp], [100, 231.9], [100, eutecticTemp], [maxSolubilityBeta, eutecticTemp]], '#45b7d1', 0.4);
    drawPhaseRegion(ctx, [[0, 100], [100, 100], [100, eutecticTemp], [0, eutecticTemp]], '#96ceb4', 0.4);
    
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(compToX(0, 0, 100), tempToY(327.5, 100, 350));
    ctx.quadraticCurveTo(
        compToX(eutecticComp/2, 0, 100), tempToY((327.5 + eutecticTemp)/2, 100, 350),
        compToX(eutecticComp, 0, 100), tempToY(eutecticTemp, 100, 350)
    );
    ctx.quadraticCurveTo(
        compToX((eutecticComp + 100)/2, 0, 100), tempToY((231.9 + eutecticTemp)/2, 100, 350),
        compToX(100, 0, 100), tempToY(231.9, 100, 350)
    );
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(compToX(0, 0, 100), tempToY(eutecticTemp, 100, 350));
    ctx.lineTo(compToX(100, 0, 100), tempToY(eutecticTemp, 100, 350));
    ctx.stroke();
    
    ctx.strokeStyle = '#7b2ff7';
    ctx.beginPath();
    ctx.moveTo(compToX(maxSolubilityAlpha, 0, 100), tempToY(eutecticTemp, 100, 350));
    ctx.lineTo(compToX(2, 0, 100), tempToY(100, 100, 350));
    ctx.stroke();
    
    ctx.font = 'bold 11px Arial';
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText('L', compToX(80, 0, 100), tempToY(280, 100, 350));
    ctx.fillStyle = '#4ecdc4';
    ctx.fillText('L + α', compToX(30, 0, 100), tempToY(220, 100, 350));
    ctx.fillStyle = '#45b7d1';
    ctx.fillText('L + β', compToX(80, 0, 100), tempToY(220, 100, 350));
    ctx.fillStyle = '#96ceb4';
    ctx.fillText('α + β', compToX(50, 0, 100), tempToY(140, 100, 350));
    
    drawAxes(ctx, '温度 (°C)', 'Sn 成分 (wt%)', pbSnData.minTemp, pbSnData.maxTemp, pbSnData.minComp, pbSnData.maxComp, 50, 20);
}

function drawGrid(ctx, minTemp, maxTemp, minComp, maxComp, tempStep, compStep) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let t = minTemp; t <= maxTemp; t += tempStep) {
        const y = tempToY(t, minTemp, maxTemp);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvasWidth - padding, y);
        ctx.stroke();
    }
    for (let c = minComp; c <= maxComp; c += compStep) {
        const x = compToX(c, minComp, maxComp);
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, canvasHeight - padding);
        ctx.stroke();
    }
}

function drawPhaseRegion(ctx, points, color, alpha) {
    if (points.length < 3) return;
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    const [firstX, firstY] = points[0];
    ctx.moveTo(compToX(firstX, 0, 100), tempToY(firstY, 100, 350));
    for (let i = 1; i < points.length; i++) {
        const [x, y] = points[i];
        ctx.lineTo(compToX(x, 0, 100), tempToY(y, 100, 350));
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
}

function drawAxes(ctx, yLabel, xLabel, minTemp, maxTemp, minComp, maxComp, tempStep, compStep) {
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, canvasWidth / 2, canvasHeight - 8);
    
    ctx.save();
    ctx.translate(15, canvasHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
    
    ctx.textAlign = 'right';
    for (let t = minTemp; t <= maxTemp; t += tempStep) {
        ctx.fillText(t.toString(), padding - 5, tempToY(t, minTemp, maxTemp) + 4);
    }
    
    ctx.textAlign = 'center';
    for (let c = minComp; c <= maxComp; c += compStep) {
        ctx.fillText(c.toString(), compToX(c, minComp, maxComp), canvasHeight - padding + 18);
    }
}

function calculatePbSnPhaseInfo(temp, comp) {
    const { eutecticTemp, eutecticComp, maxSolubilityAlpha, maxSolubilityBeta } = pbSnData;
    
    if (temp > eutecticTemp) {
        if (comp < eutecticComp && temp > 300) {
            return { phases: ['L'], composition: { L: 100 }, description: '完全液相区' };
        } else if (comp > eutecticComp && temp > 250) {
            return { phases: ['L'], composition: { L: 100 }, description: '完全液相区' };
        } else {
            if (comp < eutecticComp) {
                const wa = ((eutecticComp - comp) / (eutecticComp - maxSolubilityAlpha)) * 100;
                return { phases: ['L', 'α'], composition: { L: Math.max(0, 100 - wa), α: Math.min(100, wa) }, description: '初生α枝晶生长中' };
            } else {
                const wb = ((comp - eutecticComp) / (maxSolubilityBeta - eutecticComp)) * 100;
                return { phases: ['L', 'β'], composition: { L: Math.max(0, 100 - wb), β: Math.min(100, wb) }, description: '初生β相生长中' };
            }
        }
    } else {
        const wa = ((100 - comp) / 81) * 100;
        return { phases: ['α', 'β'], composition: { α: Math.max(0, wa), β: Math.max(0, 100 - wa) }, description: '层片状共晶组织' };
    }
}

function drawCursorOnDiagram(canvasId, x, y, minTemp, maxTemp, minComp, maxComp) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvasWidth - padding, y);
    ctx.moveTo(x, padding);
    ctx.lineTo(x, canvasHeight - padding);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7b2ff7';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
}

function drawMicrostructure(microCanvasId, temp, comp, phaseInfo) {
    const canvas = document.getElementById(microCanvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (!phaseInfo || !phaseInfo.phases) return;
    const phases = phaseInfo.phases;

    if (phases.includes('L') && phases.length === 1) {
        drawLiquidPhase(ctx);
    } else if (phases.includes('L') && phases.includes('α')) {
        drawDendriticMicrostructure(ctx, 'alpha', phaseInfo.composition.α);
    } else if (phases.includes('L') && phases.includes('β')) {
        drawDendriticMicrostructure(ctx, 'beta', phaseInfo.composition.β);
    } else if (phases.includes('α') && phases.includes('β')) {
        drawEutecticMicrostructure(ctx);
    } else if (phases.includes('α') || phases.includes('β')) {
        drawSinglePhase(ctx, phases.includes('α') ? '#4ecdc4' : '#ff6b6b', phases.includes('α') ? 'α' : 'β');
    }
}

function drawLiquidPhase(ctx) {
    ctx.fillStyle = 'rgba(255, 107, 107, 0.6)';
    ctx.fillRect(50, 50, canvasWidth - 100, canvasHeight - 100);
    
    for (let i = 0; i < 50; i++) {
        const x = 50 + Math.random() * (canvasWidth - 100);
        const y = 50 + Math.random() * (canvasHeight - 100);
        ctx.beginPath();
        ctx.arc(x, y, 2 + Math.random() * 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
    }

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('液相 (L)', canvasWidth / 2, canvasHeight / 2);
}

function drawDendriticMicrostructure(ctx, type, fraction) {
    const color = type === 'alpha' ? '#4ecdc4' : '#ff6b6b';
    
    ctx.fillStyle = 'rgba(255, 107, 107, 0.4)';
    ctx.fillRect(50, 50, canvasWidth - 100, canvasHeight - 100);

    const numDendrites = Math.floor(3 + (fraction / 100) * 8);
    
    for (let d = 0; d < numDendrites; d++) {
        const centerX = 80 + Math.random() * (canvasWidth - 160);
        const centerY = 80 + Math.random() * (canvasHeight - 160);
        drawDendrite(ctx, centerX, centerY, color, 0.5 + Math.random() * 0.5);
    }

    ctx.fillStyle = color;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`初生${type === 'alpha' ? 'α' : 'β'}相枝晶 + 液相 L`, canvasWidth / 2, 35);
}

function drawDendrite(ctx, x, y, color, scale) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3 * scale;
    ctx.lineCap = 'round';

    const primaryLength = 35 * scale;
    const secondaryLength = 15 * scale;
    const tertiaryLength = 7 * scale;

    const angles = [0, Math.PI / 2, Math.PI, Math.PI / 2 * 3];

    angles.forEach(angle => {
        const endX = x + Math.cos(angle) * primaryLength;
        const endY = y + Math.sin(angle) * primaryLength;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        for (let i = 1; i <= 3; i++) {
            const branchX = x + Math.cos(angle) * primaryLength * (i / 4);
            const branchY = y + Math.sin(angle) * primaryLength * (i / 4);
            
            [-1, 1].forEach(dir => {
                const secAngle = angle + dir * Math.PI / 3;
                const secEndX = branchX + Math.cos(secAngle) * secondaryLength;
                const secEndY = branchY + Math.sin(secAngle) * secondaryLength;
                
                ctx.beginPath();
                ctx.moveTo(branchX, branchY);
                ctx.lineTo(secEndX, secEndY);
                ctx.stroke();

                const tertAngle = secAngle + dir * Math.PI / 4;
                const tertEndX = secEndX + Math.cos(tertAngle) * tertiaryLength;
                const tertEndY = secEndY + Math.sin(tertAngle) * tertiaryLength;
                
                ctx.beginPath();
                ctx.moveTo(secEndX, secEndY);
                ctx.lineTo(tertEndX, tertEndY);
                ctx.stroke();
            });
        }
    });

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 5 * scale, 0, Math.PI * 2);
    ctx.fill();
}

function drawEutecticMicrostructure(ctx) {
    for (let gx = 0; gx < 5; gx++) {
        for (let gy = 0; gy < 4; gy++) {
            const grainX = 70 + gx * 90;
            const grainY = 70 + gy * 80;
            const orientation = Math.random() * Math.PI;
            drawEutecticGrain(ctx, grainX, grainY, 40, orientation);
        }
    }

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('共晶组织: 层片状 α + β', canvasWidth / 2, 35);
}

function drawEutecticGrain(ctx, centerX, centerY, size, orientation) {
    const layerThickness = 4;
    const layers = Math.floor(size * 2 / layerThickness);
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(orientation);
    
    for (let i = 0; i < layers; i++) {
        const y = -size + i * layerThickness;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(78, 205, 196, 0.8)' : 'rgba(255, 107, 107, 0.8)';
        ctx.fillRect(-size, y, size * 2, layerThickness - 0.5);
    }
    
    ctx.restore();
}

function drawSinglePhase(ctx, color, phaseName) {
    for (let i = 0; i < 15; i++) {
        const x = 60 + Math.random() * (canvasWidth - 120);
        const y = 60 + Math.random() * (canvasHeight - 120);
        const size = 20 + Math.random() * 25;
        
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5 + Math.random() * 0.3;
        ctx.beginPath();
        drawGrain(ctx, x, y, size);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`单相 ${phaseName} 固溶体`, canvasWidth / 2, canvasHeight / 2);
}

function drawGrain(ctx, x, y, size) {
    const sides = 5 + Math.floor(Math.random() * 3);
    ctx.moveTo(x + size * Math.cos(0), y + size * Math.sin(0));
    for (let i = 1; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const r = size * (0.7 + Math.random() * 0.3);
        ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
    }
    ctx.closePath();
}

function initPbSnInteractions() {
    const canvas = document.getElementById('phaseDiagram');
    if (!canvas) return;
    
    const handler = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (x >= padding && x <= canvasWidth - padding && y >= padding && y <= canvasHeight - padding) {
            pbSnCurrent.comp = Math.max(0, Math.min(100, xToComp(x, 0, 100)));
            pbSnCurrent.temp = Math.max(100, Math.min(350, yToTemp(y, 100, 350)));
            pbSnCurrent.phaseInfo = calculatePbSnPhaseInfo(pbSnCurrent.temp, pbSnCurrent.comp);
            
            drawPhaseDiagram();
            drawCursorOnDiagram('phaseDiagram', x, y, 100, 350, 0, 100);
            drawMicrostructure('microstructure', pbSnCurrent.temp, pbSnCurrent.comp, pbSnCurrent.phaseInfo);
            updateDisplay('tempDisplay', 'compDisplay', 'phaseDisplay', pbSnCurrent.temp, pbSnCurrent.comp, pbSnCurrent.phaseInfo);
        }
    };
    
    canvas.addEventListener('mousemove', handler);
    canvas.addEventListener('click', handler);
    
    document.getElementById('clearBtn')?.addEventListener('click', () => {
        pbSnCurrent = { temp: 200, comp: 50, phaseInfo: null };
        drawPhaseDiagram();
        const microCanvas = document.getElementById('microstructure');
        if (microCanvas) {
            const ctx = microCanvas.getContext('2d');
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            ctx.fillStyle = '#0a0a1a';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
        document.getElementById('phaseDisplay').innerHTML = '移动鼠标查看相组成...';
        document.getElementById('tempDisplay').textContent = '200';
        document.getElementById('compDisplay').textContent = '50';
    });
}

function updateDisplay(tempId, compId, phaseId, temp, comp, phaseInfo) {
    const tempEl = document.getElementById(tempId);
    const compEl = document.getElementById(compId);
    const phaseEl = document.getElementById(phaseId);
    
    if (tempEl) tempEl.textContent = temp.toFixed(1);
    if (compEl) compEl.textContent = comp.toFixed(1);
    
    if (phaseEl && phaseInfo) {
        let phaseText = `<strong>${phaseInfo.description}</strong><br>`;
        Object.entries(phaseInfo.composition).forEach(([phase, fraction]) => {
            phaseText += `${phase}: ${fraction.toFixed(1)}%  `;
        });
        phaseEl.innerHTML = phaseText;
    }
}

const feCData = {
    minTemp: 200,
    maxTemp: 1600,
    minComp: 0,
    maxComp: 6.69
};

let feCCurrent = { temp: 800, comp: 0.4, phaseInfo: null };

function drawFeCDiagram() {
    const canvas = document.getElementById('feCDiagram');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    drawGrid(ctx, feCData.minTemp, feCData.maxTemp, feCData.minComp, feCData.maxComp, 200, 1);
    
    drawFeCPhaseRegions(ctx);
    drawFeCBoundaries(ctx);
    drawFeCLabels(ctx);
    drawFeCAxes(ctx);
}

function drawFeCPhaseRegions(ctx) {
    const mt = feCData.minTemp, Mt = feCData.maxTemp;
    const mc = feCData.minComp, Mc = feCData.maxComp;
    
    drawFeCRegion(ctx, [[0, 1538], [6.69, 1200], [6.69, 1600], [0, 1600]], '#ff6b6b', 0.3);
    drawFeCRegion(ctx, [[0.09, 1495], [0.5, 1400], [0.1, 912], [0, 912], [0, 1538]], '#4ecdc4', 0.3);
    drawFeCRegion(ctx, [[2.11, 1148], [0.77, 727], [0.02, 727], [0, 727], [0, 912], [0.1, 912], [0.5, 1400]], '#ffd93d', 0.3);
    drawFeCRegion(ctx, [[0, mt], [6.69, mt], [6.69, 727], [0.77, 727], [0, 727]], '#7b2ff7', 0.3);
}

function drawFeCRegion(ctx, points, color, alpha) {
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    const [fx, fy] = points[0];
    ctx.moveTo(compToX(fx, 0, 6.69), tempToY(fy, 200, 1600));
    for (let i = 1; i < points.length; i++) {
        const [x, y] = points[i];
        ctx.lineTo(compToX(x, 0, 6.69), tempToY(y, 200, 1600));
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
}

function drawFeCBoundaries(ctx) {
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(compToX(0, 0, 6.69), tempToY(1538, 200, 1600));
    ctx.lineTo(compToX(4.3, 0, 6.69), tempToY(1148, 200, 1600));
    ctx.lineTo(compToX(6.69, 0, 6.69), tempToY(1200, 200, 1600));
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(compToX(0.09, 0, 6.69), tempToY(1495, 200, 1600));
    ctx.lineTo(compToX(0.17, 0, 6.69), tempToY(1400, 200, 1600));
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(compToX(0.77, 0, 6.69), tempToY(727, 200, 1600));
    ctx.lineTo(compToX(2.11, 0, 6.69), tempToY(1148, 200, 1600));
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(compToX(0.02, 0, 6.69), tempToY(727, 200, 1600));
    ctx.lineTo(compToX(0.1, 0, 6.69), tempToY(912, 200, 1600));
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(compToX(0, 0, 6.69), tempToY(727, 200, 1600));
    ctx.lineTo(compToX(6.69, 0, 6.69), tempToY(727, 200, 1600));
    ctx.stroke();
}

function drawFeCLabels(ctx) {
    ctx.font = 'bold 10px Arial';
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText('L', compToX(5, 0, 6.69), tempToY(1400, 200, 1600));
    ctx.fillStyle = '#4ecdc4';
    ctx.fillText('δ + L', compToX(0.3, 0, 6.69), tempToY(1500, 200, 1600));
    ctx.fillStyle = '#ffd93d';
    ctx.fillText('γ (奥氏体)', compToX(1, 0, 6.69), tempToY(900, 200, 1600));
    ctx.fillStyle = '#7b2ff7';
    ctx.fillText('α + Fe₃C', compToX(3, 0, 6.69), tempToY(400, 200, 1600));
}

function drawFeCAxes(ctx) {
    ctx.fillStyle = '#fff';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('C 成分 (wt%)', canvasWidth / 2, canvasHeight - 8);
    
    ctx.save();
    ctx.translate(15, canvasHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('温度 (°C)', 0, 0);
    ctx.restore();
    
    ctx.textAlign = 'right';
    for (let t = 400; t <= 1600; t += 200) {
        ctx.fillText(t.toString(), padding - 5, tempToY(t, 200, 1600) + 4);
    }
    
    ctx.textAlign = 'center';
    for (let c = 0; c <= 6; c += 1) {
        ctx.fillText(c.toString(), compToX(c, 0, 6.69), canvasHeight - padding + 18);
    }
}

function calculateFeCPhaseInfo(temp, comp) {
    if (temp > 1500) {
        return { phases: ['L'], composition: { L: 100 }, description: '钢水完全液相' };
    } else if (temp > 1400 && comp < 0.5) {
        return { phases: ['δ', 'L'], composition: { δ: 50, L: 50 }, description: 'δ铁素体形成中' };
    } else if (temp > 912 && comp < 0.0218) {
        return { phases: ['δ'], composition: { δ: 100 }, description: '高温铁素体单相区' };
    } else if (temp > 727 && comp < 2.11) {
        if (comp < 0.77) {
            const ferriteTemp = Math.max(0.0218, 0.77 - (temp - 727) * 0.001);
            const wf = (0.77 - comp) / (0.77 - ferriteTemp) * 100;
            return { phases: ['α', 'γ'], composition: { α: Math.max(0, wf), γ: Math.min(100, 100 - wf) }, description: '亚共析钢，奥氏体 + 铁素体' };
        } else {
            const wc = (comp - 0.77) / (2.11 - 0.77) * 100;
            return { phases: ['γ', 'Fe₃C'], composition: { γ: Math.max(0, 100 - wc), Fe₃C: Math.min(100, wc) }, description: '过共析钢，奥氏体 + 渗碳体' };
        }
    } else if (temp > 727) {
        return { phases: ['γ'], composition: { γ: 100 }, description: '奥氏体单相区' };
    } else {
        if (comp < 0.77) {
            const pf = (0.77 - comp) / (0.77 - 0.0218) * 100;
            const pearlite = 100 - pf;
            return { phases: ['α', 'P'], composition: { α: Math.max(0, pf), P: Math.min(100, pearlite) }, description: '室温组织：铁素体 + 珠光体' };
        } else {
            const pc = (comp - 0.77) / (6.69 - 0.77) * 100;
            const pearlite = 100 - pc;
            return { phases: ['P', 'Fe₃C'], composition: { P: Math.max(0, pearlite), Fe₃C: Math.min(100, pc) }, description: '室温组织：珠光体 + 二次渗碳体' };
        }
    }
}

function drawFeCMicrostructure(temp, comp, phaseInfo) {
    const canvas = document.getElementById('feCMicrostructure');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (!phaseInfo || !phaseInfo.phases) return;
    const phases = phaseInfo.phases;

    if (phases.includes('L') && phases.length === 1) {
        drawLiquidPhase(ctx);
    } else if (phases.includes('γ') && phases.includes('α')) {
        drawSteelAusteniteFerrite(ctx);
    } else if (phases.includes('P') || (temp <= 727)) {
        drawPearliteMicrostructure(ctx, comp);
    } else if (phases.includes('γ')) {
        drawSinglePhase(ctx, '#ffd93d', 'γ');
    }
}

function drawSteelAusteniteFerrite(ctx) {
    for (let i = 0; i < 20; i++) {
        const x = 60 + Math.random() * (canvasWidth - 120);
        const y = 60 + Math.random() * (canvasHeight - 120);
        const size = 15 + Math.random() * 20;
        
        ctx.fillStyle = '#4ecdc4';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        drawGrain(ctx, x, y, size);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    
    ctx.fillStyle = 'rgba(255, 217, 61, 0.4)';
    ctx.fillRect(50, 50, canvasWidth - 100, canvasHeight - 100);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('γ 奥氏体 + α 铁素体', canvasWidth / 2, 35);
}

function drawPearliteMicrostructure(ctx, comp) {
    const pearliteFraction = comp < 0.77 ? (comp / 0.77) * 0.7 : 0.9;
    const numGrains = Math.floor(pearliteFraction * 15);
    
    for (let gx = 0; gx < 5; gx++) {
        for (let gy = 0; gy < 4; gy++) {
            const isPearlite = Math.random() < pearliteFraction;
            const grainX = 70 + gx * 90;
            const grainY = 70 + gy * 80;
            
            if (isPearlite) {
                const orientation = Math.random() * Math.PI;
                drawEutecticGrain(ctx, grainX, grainY, 30, orientation);
            } else {
                ctx.fillStyle = 'rgba(78, 205, 196, 0.6)';
                ctx.beginPath();
                drawGrain(ctx, grainX, grainY, 35);
                ctx.fill();
            }
        }
    }

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('珠光体 + 铁素体 (P + α)', canvasWidth / 2, 35);
}

function initFeCInteractions() {
    const canvas = document.getElementById('feCDiagram');
    if (!canvas) return;
    
    const handler = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (x >= padding && x <= canvasWidth - padding && y >= padding && y <= canvasHeight - padding) {
            feCCurrent.comp = Math.max(0, Math.min(6.69, xToComp(x, 0, 6.69)));
            feCCurrent.temp = Math.max(200, Math.min(1600, yToTemp(y, 200, 1600)));
            feCCurrent.phaseInfo = calculateFeCPhaseInfo(feCCurrent.temp, feCCurrent.comp);
            
            drawFeCDiagram();
            
            const ctx = canvas.getContext('2d');
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(canvasWidth - padding, y);
            ctx.moveTo(x, padding);
            ctx.lineTo(x, canvasHeight - padding);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#7b2ff7';
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
            
            drawFeCMicrostructure(feCCurrent.temp, feCCurrent.comp, feCCurrent.phaseInfo);
            updateDisplay('feCTempDisplay', 'feCCompDisplay', 'feCPhaseDisplay', feCCurrent.temp, feCCurrent.comp, feCCurrent.phaseInfo);
        }
    };
    
    canvas.addEventListener('mousemove', handler);
    canvas.addEventListener('click', handler);
    
    document.getElementById('feCClearBtn')?.addEventListener('click', () => {
        feCCurrent = { temp: 800, comp: 0.4, phaseInfo: null };
        drawFeCDiagram();
        const microCanvas = document.getElementById('feCMicrostructure');
        if (microCanvas) {
            const ctx = microCanvas.getContext('2d');
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            ctx.fillStyle = '#0a0a1a';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
    });
}

let tttCurrent = { coolingRate: 10, currentTemp: 900, phaseInfo: null, isCooling: false };

function drawTTTDiagram() {
    const canvas = document.getElementById('tttDiagram');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let t = 200; t <= 800; t += 100) {
        const y = padding + ((800 - t) / 600) * (canvasHeight - 2 * padding);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvasWidth - padding, y);
        ctx.stroke();
    }
    
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const startY = padding + ((800 - 727) / 600) * (canvasHeight - 2 * padding);
    ctx.moveTo(padding + 30, startY);
    ctx.bezierCurveTo(
        padding + 100, startY + 30,
        padding + 150, padding + 150,
        padding + 200, padding + 200
    );
    ctx.bezierCurveTo(
        padding + 300, padding + 150,
        padding + 380, startY + 30,
        canvasWidth - padding - 30, startY
    );
    ctx.stroke();
    
    ctx.strokeStyle = '#4ecdc4';
    ctx.beginPath();
    ctx.moveTo(padding + 50, startY);
    ctx.bezierCurveTo(
        padding + 120, startY + 50,
        padding + 180, padding + 180,
        padding + 240, padding + 230
    );
    ctx.bezierCurveTo(
        padding + 320, padding + 180,
        padding + 400, startY + 50,
        canvasWidth - padding - 10, startY
    );
    ctx.stroke();
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Ms', padding + 30, startY - 10);
    ctx.fillText('Mf', padding + 30, padding + (canvasHeight - 2 * padding) - 10);
    
    ctx.font = '11px Arial';
    ctx.fillText('珠光体区', canvasWidth - padding - 50, startY - 20);
    ctx.fillStyle = '#4ecdc4';
    ctx.fillText('贝氏体区', canvasWidth / 2, padding + 150);
    
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    for (let t = 200; t <= 800; t += 100) {
        const y = padding + ((800 - t) / 600) * (canvasHeight - 2 * padding);
        ctx.fillText(t + '°C', padding - 5, y + 4);
    }
    
    ctx.textAlign = 'center';
    ctx.fillText('时间 (对数坐标)', canvasWidth / 2, canvasHeight - 10);
}

function drawCoolingCurve(rate) {
    const canvas = document.getElementById('tttDiagram');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const startTemp = 900;
    const endTemp = 100;
    const tempRange = 600;
    
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    
    const startY = padding + ((800 - Math.min(800, tttCurrent.currentTemp)) / tempRange) * (canvasHeight - 2 * padding);
    const startX = padding + 50;
    ctx.moveTo(startX, startY);
    
    const progress = (startTemp - tttCurrent.currentTemp) / (startTemp - endTemp);
    const currentX = startX + progress * (canvasWidth - 2 * padding - 100);
    ctx.lineTo(currentX, startY);
    ctx.stroke();
    
    ctx.fillStyle = '#00d4ff';
    ctx.beginPath();
    ctx.arc(currentX, startY, 6, 0, Math.PI * 2);
    ctx.fill();
}

function updateTTTMicrostructure() {
    const canvas = document.getElementById('tttMicrostructure');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const coolingRate = tttCurrent.coolingRate;
    const temp = tttCurrent.currentTemp;
    
    if (temp > 727) {
        ctx.fillStyle = 'rgba(255, 217, 61, 0.5)';
        ctx.fillRect(50, 50, canvasWidth - 100, canvasHeight - 100);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('奥氏体 γ', canvasWidth / 2, canvasHeight / 2);
        tttCurrent.phaseInfo = { phases: ['γ'], composition: { γ: 100 }, description: '高温奥氏体组织' };
    } else if (coolingRate < 5) {
        drawPearliteMicrostructure(ctx, 0.4);
        tttCurrent.phaseInfo = { phases: ['P', 'α'], composition: { P: 60, α: 40 }, description: '缓慢冷却：珠光体组织' };
    } else if (coolingRate < 30) {
        drawBainiteMicrostructure(ctx);
        tttCurrent.phaseInfo = { phases: ['B'], composition: { B: 100 }, description: '中速冷却：贝氏体组织' };
    } else {
        drawMartensiteMicrostructure(ctx);
        tttCurrent.phaseInfo = { phases: ['M'], composition: { M: 100 }, description: '快速冷却：马氏体组织' };
    }
    
    updateDisplay('tttCoolingDisplay', 'tttTempDisplay', 'tttPhaseDisplay', coolingRate, temp, tttCurrent.phaseInfo);
}

function drawBainiteMicrostructure(ctx) {
    for (let i = 0; i < 40; i++) {
        const x = 60 + Math.random() * (canvasWidth - 120);
        const y = 60 + Math.random() * (canvasHeight - 120);
        const length = 15 + Math.random() * 25;
        const angle = Math.random() * Math.PI;
        
        ctx.strokeStyle = 'rgba(78, 205, 196, 0.7)';
        ctx.lineWidth = 3 + Math.random() * 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
        ctx.stroke();
    }

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('上贝氏体组织 (羽毛状)', canvasWidth / 2, 35);
}

function drawMartensiteMicrostructure(ctx) {
    for (let i = 0; i < 25; i++) {
        const x = 60 + Math.random() * (canvasWidth - 120);
        const y = 60 + Math.random() * (canvasHeight - 120);
        const length = 30 + Math.random() * 40;
        const angle = Math.random() * Math.PI;
        
        ctx.strokeStyle = 'rgba(255, 107, 107, 0.8)';
        ctx.lineWidth = 4 + Math.random() * 4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255, 107, 107, 0.6)';
        ctx.beginPath();
        ctx.arc(x + Math.cos(angle) * length * 0.3, y + Math.sin(angle) * length * 0.3, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('马氏体组织 (针片状)', canvasWidth / 2, 35);
}

function initTTTInteractions() {
    const slider = document.getElementById('coolingRateSlider');
    if (slider) {
        slider.addEventListener('input', (e) => {
            tttCurrent.coolingRate = parseFloat(e.target.value);
            document.getElementById('coolingRateValue').textContent = tttCurrent.coolingRate + ' °C/s';
            document.getElementById('tttCoolingDisplay').textContent = tttCurrent.coolingRate;
        });
    }
    
    document.getElementById('startCoolingBtn')?.addEventListener('click', startCoolingAnimation);
    document.getElementById('resetCoolingBtn')?.addEventListener('click', resetCooling);
}

function startCoolingAnimation() {
    if (isCooling) return;
    isCooling = true;
    tttCurrent.currentTemp = 900;
    
    document.getElementById('startCoolingBtn').textContent = '⏸️ 冷却中...';
    document.getElementById('startCoolingBtn').disabled = true;
    
    function animate(timestamp) {
        if (tttCurrent.currentTemp > 100) {
            if (timestamp - lastAnimationFrameTime >= ANIMATION_THROTTLE) {
                tttCurrent.currentTemp -= tttCurrent.coolingRate / 10;
                drawTTTDiagram();
                drawCoolingCurve(tttCurrent.coolingRate);
                updateTTTMicrostructureOptimized();
                lastAnimationFrameTime = timestamp;
            }
            coolingAnimationId = requestAnimationFrame(animate);
        } else {
            isCooling = false;
            document.getElementById('startCoolingBtn').textContent = '▶️ 开始冷却';
            document.getElementById('startCoolingBtn').disabled = false;
        }
    }
    
    animate(0);
}

let cachedMicrostructureData = { phase: null, cache: null };

function updateTTTMicrostructureOptimized() {
    const canvas = document.getElementById('tttMicrostructure');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const coolingRate = tttCurrent.coolingRate;
    const temp = tttCurrent.currentTemp;
    
    let currentPhase;
    if (temp > 727) currentPhase = 'austenite';
    else if (coolingRate < 5) currentPhase = 'pearlite';
    else if (coolingRate < 30) currentPhase = 'bainite';
    else currentPhase = 'martensite';
    
    if (cachedMicrostructureData.phase !== currentPhase) {
        cachedMicrostructureData = {
            phase: currentPhase,
            cache: generateCachedMicrostructureData(currentPhase)
        };
    }
    
    drawCachedMicrostructure(ctx, currentPhase, cachedMicrostructureData.cache);
    
    const phaseInfoText = {
        'austenite': { phases: ['γ'], desc: '高温奥氏体组织' },
        'pearlite': { phases: ['P', 'α'], desc: '缓慢冷却：珠光体组织' },
        'bainite': { phases: ['B'], desc: '中速冷却：贝氏体组织' },
        'martensite': { phases: ['M'], desc: '快速冷却：马氏体组织' }
    };
    
    tttCurrent.phaseInfo = {
        phases: phaseInfoText[currentPhase].phases,
        composition: phaseInfoText[currentPhase].phases.reduce((acc, p) => ({ ...acc, [p]: 100 / phaseInfoText[currentPhase].phases.length }), {}),
        description: phaseInfoText[currentPhase].desc
    };
    
    updateDisplay('tttCoolingDisplay', 'tttTempDisplay', 'tttPhaseDisplay', coolingRate, temp, tttCurrent.phaseInfo);
}

function generateCachedMicrostructureData(phase) {
    const data = [];
    switch(phase) {
        case 'austenite':
            return { type: 'austenite' };
        case 'pearlite':
            for (let i = 0; i < 20; i++) {
                data.push({
                    x: 70 + (i % 5) * 90,
                    y: 70 + Math.floor(i / 5) * 80,
                    isPearlite: Math.random() < 0.7,
                    orientation: Math.random() * Math.PI
                });
            }
            return { type: 'pearlite', grains: data };
        case 'bainite':
            for (let i = 0; i < 40; i++) {
                data.push({
                    x: 60 + Math.random() * (canvasWidth - 120),
                    y: 60 + Math.random() * (canvasHeight - 120),
                    length: 15 + Math.random() * 25,
                    angle: Math.random() * Math.PI,
                    width: 3 + Math.random() * 3
                });
            }
            return { type: 'bainite', needles: data };
        case 'martensite':
            for (let i = 0; i < 25; i++) {
                data.push({
                    x: 60 + Math.random() * (canvasWidth - 120),
                    y: 60 + Math.random() * (canvasHeight - 120),
                    length: 30 + Math.random() * 40,
                    angle: Math.random() * Math.PI,
                    width: 4 + Math.random() * 4
                });
            }
            return { type: 'martensite', needles: data };
    }
    return data;
}

function drawCachedMicrostructure(ctx, phase, cache) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    
    switch(phase) {
        case 'austenite':
            ctx.fillStyle = 'rgba(255, 217, 61, 0.5)';
            ctx.fillRect(50, 50, canvasWidth - 100, canvasHeight - 100);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px Arial';
            ctx.fillText('奥氏体 γ', canvasWidth / 2, canvasHeight / 2);
            break;
        case 'pearlite':
            cache.grains.forEach(g => {
                if (g.isPearlite) {
                    drawEutecticGrain(ctx, g.x, g.y, 30, g.orientation);
                } else {
                    ctx.fillStyle = 'rgba(78, 205, 196, 0.6)';
                    ctx.beginPath();
                    drawGrain(ctx, g.x, g.y, 35);
                    ctx.fill();
                }
            });
            ctx.fillText('珠光体 + 铁素体 (P + α)', canvasWidth / 2, 35);
            break;
        case 'bainite':
            cache.needles.forEach(n => {
                ctx.strokeStyle = 'rgba(78, 205, 196, 0.7)';
                ctx.lineWidth = n.width;
                ctx.beginPath();
                ctx.moveTo(n.x, n.y);
                ctx.lineTo(n.x + Math.cos(n.angle) * n.length, n.y + Math.sin(n.angle) * n.length);
                ctx.stroke();
            });
            ctx.fillText('上贝氏体组织 (羽毛状)', canvasWidth / 2, 35);
            break;
        case 'martensite':
            cache.needles.forEach(n => {
                ctx.strokeStyle = 'rgba(255, 107, 107, 0.8)';
                ctx.lineWidth = n.width;
                ctx.beginPath();
                ctx.moveTo(n.x, n.y);
                ctx.lineTo(n.x + Math.cos(n.angle) * n.length, n.y + Math.sin(n.angle) * n.length);
                ctx.stroke();
            });
            ctx.fillText('马氏体组织 (针片状)', canvasWidth / 2, 35);
            break;
    }
}

function resetCooling() {
    if (coolingAnimationId) {
        cancelAnimationFrame(coolingAnimationId);
    }
    isCooling = false;
    tttCurrent.currentTemp = 900;
    cachedMicrostructureData = { phase: null, cache: null };
    document.getElementById('startCoolingBtn').textContent = '▶️ 开始冷却';
    document.getElementById('startCoolingBtn').disabled = false;
    drawTTTDiagram();
    updateTTTMicrostructure();
}

function leverLaw(C0, Ca, Cb) {
    const diff = Cb - Ca;
    if (Math.abs(diff) < 0.0001) {
        return { wa: C0 <= Ca ? 100 : 0, wb: C0 >= Cb ? 100 : 0 };
    }
    let wa = ((Cb - C0) / diff) * 100;
    let wb = ((C0 - Ca) / diff) * 100;
    return { wa: Math.max(0, Math.min(100, wa)), wb: Math.max(0, Math.min(100, wb)) };
}

function calculateEutectoidFraction(C0, Cferrite, Ceutectoid) {
    const diff = Ceutectoid - Cferrite;
    if (Math.abs(diff) < 0.0001) {
        return { proeutectoid: 50, pearlite: 50 };
    }
    let proeutectoid = ((Ceutectoid - C0) / diff) * 100;
    proeutectoid = Math.max(0, Math.min(100, proeutectoid));
    return { proeutectoid, pearlite: 100 - proeutectoid };
}

let leverCurrent = { C0: 50, Ca: 20, Cb: 80, diagramType: 'eutectic' };

function drawLeverDiagram(type = 'eutectic') {
    const canvas = document.getElementById('leverDiagram');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const isEutectic = type === 'eutectic';
    const title = isEutectic ? '共晶相图示意图' : '共析相图示意图';
    const temp1 = isEutectic ? 350 : 727;
    const temp2 = isEutectic ? 183 : 550;
    
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(padding, padding + 50);
    ctx.lineTo(canvasWidth / 2, padding + 150);
    ctx.lineTo(canvasWidth - padding, padding + 80);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(padding, padding + 150);
    ctx.lineTo(canvasWidth - padding, padding + 150);
    ctx.stroke();
    
    ctx.strokeStyle = '#7b2ff7';
    ctx.beginPath();
    ctx.moveTo(padding + 80, padding + 150);
    ctx.lineTo(padding + 40, canvasHeight - padding);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(canvasWidth - padding - 80, padding + 150);
    ctx.lineTo(canvasWidth - padding - 40, canvasHeight - padding);
    ctx.stroke();
    
    const x0 = canvasWidth / 2;
    const xa = padding + 60;
    const xb = canvasWidth - padding - 60;
    const yLine = canvasHeight - padding - 50;
    
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(xa, yLine);
    ctx.lineTo(xb, yLine);
    ctx.stroke();
    
    ctx.strokeStyle = '#ffd93d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(xa, yLine - 20);
    ctx.lineTo(xa, yLine + 20);
    ctx.moveTo(x0, yLine - 20);
    ctx.lineTo(x0, yLine + 20);
    ctx.moveTo(xb, yLine - 20);
    ctx.lineTo(xb, yLine + 20);
    ctx.stroke();
    
    drawLeverArrow(ctx, xa, yLine, x0, yLine, '#4ecdc4', 'Wα');
    drawLeverArrow(ctx, x0, yLine, xb, yLine, '#ff6b6b', 'Wβ');
    
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Cα = ${leverCurrent.Ca}%`, xa, yLine + 40);
    ctx.fillText(`C₀ = ${leverCurrent.C0}%`, x0, yLine + 40);
    ctx.fillText(`Cβ = ${leverCurrent.Cb}%`, xb, yLine + 40);
    
    ctx.font = 'bold 16px Arial';
    ctx.fillText(title, canvasWidth / 2, 35);
    
    ctx.font = '12px Arial';
    ctx.fillStyle = '#00d4ff';
    ctx.fillText('L', canvasWidth / 2, padding + 120);
    ctx.fillStyle = '#7b2ff7';
    ctx.fillText('α + β', canvasWidth / 2, padding + 200);
}

function drawLeverArrow(ctx, x1, y1, x2, y2, color, label) {
    const headLen = 10;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1 - 10);
    ctx.lineTo(x2 - headLen * Math.cos(angle), y1 - 10 - headLen * Math.sin(angle));
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x2, y1 - 10);
    ctx.lineTo(x1 + headLen * Math.cos(angle), y1 - 10 + headLen * Math.sin(angle));
    ctx.stroke();
    
    ctx.fillStyle = color;
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, (x1 + x2) / 2, y1 - 20);
}

function generateNewExercise() {
    const Ca = Math.floor(10 + Math.random() * 20);
    const Cb = Math.floor(70 + Math.random() * 20);
    const C0 = Math.floor(Ca + 10 + Math.random() * (Cb - Ca - 20));
    
    currentExercise = { Ca, Cb, C0 };
    leverCurrent = { C0, Ca, Cb, diagramType: 'eutectic' };
    
    document.getElementById('exerciseQuestion').innerHTML = `
        问题：已知合金成分为 C₀ = ${C0}%，α相成分为 C<sub>α</sub> = ${Ca}%，β相成分为 C<sub>β</sub> = ${Cb}%，<br>
        请计算 α 相和 β 相的质量分数（W<sub>α</sub> 和 W<sub>β</sub>），保留整数。
    `;
    
    document.getElementById('waInput').value = '';
    document.getElementById('wbInput').value = '';
    document.getElementById('answerFeedback').innerHTML = '';
    
    drawLeverDiagram();
}

function checkAnswer() {
    if (!currentExercise) return;
    
    const waInput = parseInt(document.getElementById('waInput').value);
    const wbInput = parseInt(document.getElementById('wbInput').value);
    
    const { Ca, Cb, C0 } = currentExercise;
    const waCorrect = Math.round(((Cb - C0) / (Cb - Ca)) * 100);
    const wbCorrect = Math.round(((C0 - Ca) / (Cb - Ca)) * 100);
    
    const waCorrectBool = Math.abs(waInput - waCorrect) <= 1;
    const wbCorrectBool = Math.abs(wbInput - wbCorrect) <= 1;
    
    const feedbackEl = document.getElementById('answerFeedback');
    
    if (waCorrectBool && wbCorrectBool) {
        feedbackEl.innerHTML = `<div style="background: rgba(78, 205, 196, 0.3); padding: 15px; border-radius: 8px; text-align: center;">
            <strong style="color: #4ecdc4; font-size: 18px;">🎉 回答正确！</strong><br>
            Wα = (Cβ - C₀) / (Cβ - Cα) × 100% = (${Cb} - ${C0}) / (${Cb} - ${Ca}) × 100% ≈ ${waCorrect}%<br>
            Wβ = (C₀ - Cα) / (Cβ - Cα) × 100% = (${C0} - ${Ca}) / (${Cb} - ${Ca}) × 100% ≈ ${wbCorrect}%
        </div>`;
    } else {
        feedbackEl.innerHTML = `<div style="background: rgba(255, 107, 107, 0.3); padding: 15px; border-radius: 8px; text-align: center;">
            <strong style="color: #ff6b6b; font-size: 18px;">❌ 回答有误</strong><br>
            请点击"显示答案"查看正确计算过程
        </div>`;
    }
}

function showAnswer() {
    if (!currentExercise) return;
    
    const { Ca, Cb, C0 } = currentExercise;
    const waCorrect = Math.round(((Cb - C0) / (Cb - Ca)) * 100);
    const wbCorrect = Math.round(((C0 - Ca) / (Cb - Ca)) * 100);
    
    document.getElementById('answerFeedback').innerHTML = `<div style="background: rgba(123, 47, 247, 0.3); padding: 15px; border-radius: 8px;">
        <strong style="color: #7b2ff7;">💡 正确答案与计算过程：</strong><br><br>
        <strong>杠杆定律公式：</strong><br>
        Wα = (Cβ - C₀) / (Cβ - Cα) × 100%<br>
        Wβ = (C₀ - Cα) / (Cβ - Cα) × 100%<br><br>
        <strong>代入数值：</strong><br>
        Wα = (${Cb} - ${C0}) / (${Cb} - ${Ca}) × 100% = ${Cb - C0} / ${Cb - Ca} × 100% ≈ <strong>${waCorrect}%</strong><br>
        Wβ = (${C0} - ${Ca}) / (${Cb} - ${Ca}) × 100% = ${C0 - Ca} / ${Cb - Ca} × 100% ≈ <strong>${wbCorrect}%</strong><br><br>
        验证：Wα + Wβ = ${waCorrect}% + ${wbCorrect}% = ${waCorrect + wbCorrect}% ✓
    </div>`;
}

function initLeverInteractions() {
    document.getElementById('checkAnswerBtn')?.addEventListener('click', checkAnswer);
    document.getElementById('showAnswerBtn')?.addEventListener('click', showAnswer);
    document.getElementById('newExerciseBtn')?.addEventListener('click', generateNewExercise);
    
    setTimeout(generateNewExercise, 100);
}

let hardnessParams = { carbon: 0.4, coolingRate: 20, temper: 200 };

function updateHardnessPrediction() {
    const { carbon, coolingRate, temper } = hardnessParams;
    
    let martensite = 0;
    let bainite = 0;
    let pearlite = 0;
    
    if (coolingRate > 40) {
        martensite = 85 + Math.min(15, carbon * 10);
    } else if (coolingRate > 15) {
        martensite = 40 + coolingRate;
        bainite = 100 - martensite - 10;
        pearlite = 10;
    } else if (coolingRate > 5) {
        bainite = 40 + coolingRate * 2;
        pearlite = 60 - coolingRate;
        martensite = 0;
    } else {
        pearlite = 80 + carbon * 10;
        bainite = 100 - pearlite;
    }
    
    let hardness = 180;
    hardness += pearlite * 2.5;
    hardness += bainite * 4;
    hardness += martensite * 8;
    hardness += carbon * 150;
    hardness -= Math.max(0, (temper - 100) * 0.5);
    
    const tensileStrength = hardness * 3.5;
    
    document.getElementById('hardnessValue').textContent = Math.round(hardness);
    document.getElementById('martensiteDisplay').textContent = Math.round(martensite) + ' %';
    document.getElementById('bainiteDisplay').textContent = Math.round(bainite) + ' %';
    document.getElementById('pearliteDisplay').textContent = Math.round(pearlite) + ' %';
    document.getElementById('tsDisplay').textContent = Math.round(tensileStrength) + ' MPa';
    
    const phaseText = martensite > bainite ? 
        (martensite > pearlite ? '马氏体为主，硬度高' : '珠光体为主，韧性好') :
        (bainite > pearlite ? '贝氏体为主，强韧性匹配' : '珠光体为主，韧性好');
    
    document.getElementById('microstructureDisplay').textContent = phaseText + ` (HV: ${Math.round(hardness)})`;
    
    drawHardnessChart();
    drawHardnessMicrostructure(martensite, bainite, pearlite);
}

function drawHardnessChart() {
    const canvas = document.getElementById('hardnessChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasWidth, 200);
    
    const chartWidth = canvasWidth - 100;
    const chartHeight = 150;
    const startX = 60;
    const startY = 180;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(startX, startY - chartHeight, chartWidth, chartHeight);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = startY - (i / 4) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(startX + chartWidth, y);
        ctx.stroke();
    }
    
    const { martensite, bainite, pearlite } = calculatePhaseFractions();
    const barWidth = chartWidth / 3 - 20;
    
    const martHeight = (martensite / 100) * chartHeight;
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(startX + 20, startY - martHeight, barWidth, martHeight);
    
    const bainHeight = (bainite / 100) * chartHeight;
    ctx.fillStyle = '#4ecdc4';
    ctx.fillRect(startX + 20 + barWidth + 20, startY - bainHeight, barWidth, bainHeight);
    
    const pearlHeight = (pearlite / 100) * chartHeight;
    ctx.fillStyle = '#ffd93d';
    ctx.fillRect(startX + 20 + (barWidth + 20) * 2, startY - pearlHeight, barWidth, pearlHeight);
    
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('马氏体', startX + 20 + barWidth / 2, startY + 15);
    ctx.fillText('贝氏体', startX + 20 + barWidth + 20 + barWidth / 2, startY + 15);
    ctx.fillText('珠光体', startX + 20 + (barWidth + 20) * 2 + barWidth / 2, startY + 15);
    ctx.textAlign = 'right';
    for (let i = 0; i <= 100; i += 25) {
        const y = startY - (i / 100) * chartHeight;
        ctx.fillText(i + '%', startX - 5, y + 4);
    }
}

function calculatePhaseFractions() {
    const { carbon, coolingRate } = hardnessParams;
    let martensite = 0, bainite = 0, pearlite = 0;
    
    if (coolingRate > 40) {
        martensite = 85 + Math.min(15, carbon * 10);
    } else if (coolingRate > 15) {
        martensite = 40 + coolingRate;
        bainite = 100 - martensite - 10;
        pearlite = 10;
    } else if (coolingRate > 5) {
        bainite = 40 + coolingRate * 2;
        pearlite = 60 - coolingRate;
    } else {
        pearlite = 80 + carbon * 10;
        bainite = 100 - pearlite;
    }
    
    return { martensite, bainite, pearlite };
}

function drawHardnessMicrostructure(m, b, p) {
    const canvas = document.getElementById('hardnessMicrostructure');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasWidth, 200);
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvasWidth, 200);
    
    for (let i = 0; i < 100; i++) {
        const x = 30 + Math.random() * (canvasWidth - 60);
        const y = 20 + Math.random() * 160;
        const r = Math.random();
        
        if (r < m / 100) {
            ctx.strokeStyle = 'rgba(255, 107, 107, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + 10 + Math.random() * 15, y + (Math.random() - 0.5) * 10);
            ctx.stroke();
        } else if (r < (m + b) / 100) {
            ctx.strokeStyle = 'rgba(78, 205, 196, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + 8 + Math.random() * 10, y + (Math.random() - 0.5) * 8);
            ctx.stroke();
        } else {
            ctx.fillStyle = 'rgba(255, 217, 61, 0.4)';
            ctx.fillRect(x - 3, y - 3, 6, 6);
        }
    }
    
    ctx.fillStyle = '#fff';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('微观组织示意图', canvasWidth / 2, 15);
}

function initHardnessInteractions() {
    const carbonSlider = document.getElementById('carbonSlider');
    const coolingSlider = document.getElementById('hardnessCoolingSlider');
    const temperSlider = document.getElementById('temperSlider');
    
    if (carbonSlider) {
        carbonSlider.addEventListener('input', (e) => {
            hardnessParams.carbon = parseFloat(e.target.value);
            document.getElementById('carbonValue').textContent = hardnessParams.carbon.toFixed(1) + ' %';
            updateHardnessPrediction();
        });
    }
    
    if (coolingSlider) {
        coolingSlider.addEventListener('input', (e) => {
            hardnessParams.coolingRate = parseFloat(e.target.value);
            document.getElementById('hardnessCoolingValue').textContent = hardnessParams.coolingRate + ' °C/s';
            updateHardnessPrediction();
        });
    }
    
    if (temperSlider) {
        temperSlider.addEventListener('input', (e) => {
            hardnessParams.temper = parseFloat(e.target.value);
            document.getElementById('temperValue').textContent = hardnessParams.temper + ' °C';
            updateHardnessPrediction();
        });
    }
}

async function saveRecord(type, data, note) {
    try {
        const response = await fetch('/api/learning-records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, ...data, userNote: note })
        });
        return await response.json();
    } catch (error) {
        console.error('保存失败:', error);
        return null;
    }
}

async function loadAllRecords() {
    try {
        const response = await fetch('/api/learning-records');
        const result = await response.json();
        if (result.success) {
            displayAllRecords(result.records);
        }
    } catch (error) {
        console.error('加载失败:', error);
    }
}

function displayAllRecords(records) {
    const listEl = document.getElementById('recordsList');
    if (!listEl) return;
    
    if (records.length === 0) {
        listEl.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">暂无学习记录，开始探索材料科学吧！</div>';
        return;
    }
    
    listEl.innerHTML = records.slice().reverse().map(record => {
        const date = new Date(record.timestamp);
        const timeStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
        
        const typeLabels = {
            'phase-diagram': { text: '相图', color: '#00d4ff' },
            'fe-c-phase': { text: 'Fe-C相图', color: '#7b2ff7' },
            'ttt': { text: 'TTT曲线', color: '#ff6b6b' },
            'lever': { text: '杠杆定律', color: '#ffd93d' },
            'hardness': { text: '硬度预测', color: '#ff9f43' }
        };
        const typeInfo = typeLabels[record.type] || { text: record.type, color: '#888' };
        
        return `
            <div class="record-item">
                <div class="record-info">
                    <div>
                        <span style="background: ${typeInfo.color}; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px;">
                            ${typeInfo.text}
                        </span>
                        <span style="margin-left: 8px; color: #888;">${timeStr}</span>
                    </div>
                    ${record.temperature ? `<div style="margin-top: 4px;">温度: ${Number(record.temperature).toFixed(1)}°C</div>` : ''}
                    ${record.composition !== undefined ? `<div>成分: ${Number(record.composition).toFixed(1)}%</div>` : ''}
                    ${record.hardness ? `<div>硬度: ${record.hardness} HV</div>` : ''}
                    ${record.userNote ? `<div class="record-note">${record.userNote}</div>` : ''}
                </div>
                <button class="btn btn-danger" style="padding: 4px 8px; font-size: 11px;" onclick="deleteRecordById(${record.id})">删除</button>
            </div>
        `;
    }).join('');
}

async function deleteRecordById(id) {
    if (!confirm('确定删除这条记录吗？')) return;
    
    try {
        const response = await fetch(`/api/learning-records/${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) {
            loadAllRecords();
        }
    } catch (error) {
        console.error('删除失败:', error);
    }
}

function initSaveButtons() {
    document.getElementById('saveBtn')?.addEventListener('click', async () => {
        if (!pbSnCurrent.phaseInfo) {
            alert('请先在相图上选择一个点');
            return;
        }
        const note = document.getElementById('noteInput').value;
        await saveRecord('phase-diagram', {
            temperature: pbSnCurrent.temp,
            composition: pbSnCurrent.comp,
            phaseComposition: pbSnCurrent.phaseInfo.composition,
            phases: pbSnCurrent.phaseInfo.phases
        }, note);
        alert('保存成功！');
        document.getElementById('noteInput').value = '';
        loadAllRecords();
    });
    
    document.getElementById('feCSaveBtn')?.addEventListener('click', async () => {
        if (!feCCurrent.phaseInfo) {
            alert('请先在相图上选择一个点');
            return;
        }
        const note = document.getElementById('feCNoteInput').value;
        await saveRecord('fe-c-phase', {
            temperature: feCCurrent.temp,
            composition: feCCurrent.comp,
            phaseComposition: feCCurrent.phaseInfo.composition,
            phases: feCCurrent.phaseInfo.phases
        }, note);
        alert('保存成功！');
        document.getElementById('feCNoteInput').value = '';
        loadAllRecords();
    });
    
    document.getElementById('tttSaveBtn')?.addEventListener('click', async () => {
        if (!tttCurrent.phaseInfo) {
            alert('请先运行冷却过程');
            return;
        }
        const note = document.getElementById('tttNoteInput').value;
        await saveRecord('ttt', {
            coolingRate: tttCurrent.coolingRate,
            temperature: tttCurrent.currentTemp,
            phaseComposition: tttCurrent.phaseInfo.composition,
            phases: tttCurrent.phaseInfo.phases
        }, note);
        alert('保存成功！');
        document.getElementById('tttNoteInput').value = '';
        loadAllRecords();
    });
    
    document.getElementById('leverSaveBtn')?.addEventListener('click', async () => {
        const note = document.getElementById('leverNoteInput').value;
        await saveRecord('lever', {
            composition: currentExercise?.C0 || 0,
            leverLawExercise: currentExercise
        }, note);
        alert('保存成功！');
        document.getElementById('leverNoteInput').value = '';
        loadAllRecords();
    });
    
    document.getElementById('hardnessSaveBtn')?.addEventListener('click', async () => {
        const note = document.getElementById('hardnessNoteInput').value;
        const hardness = parseInt(document.getElementById('hardnessValue').textContent);
        await saveRecord('hardness', {
            carbon: hardnessParams.carbon,
            coolingRate: hardnessParams.coolingRate,
            temperingTemp: hardnessParams.temper,
            hardness: hardness
        }, note);
        alert('保存成功！');
        document.getElementById('hardnessNoteInput').value = '';
        loadAllRecords();
    });
    
    document.getElementById('loadRecordsBtn')?.addEventListener('click', loadAllRecords);
}

function initApp() {
    initTabs();
    initDiagramSelectors();
    initPbSnInteractions();
    initFeCInteractions();
    initTTTInteractions();
    initLeverInteractions();
    initHardnessInteractions();
    initSaveButtons();
    
    drawPhaseDiagram();
    drawFeCDiagram();
    drawTTTDiagram();
    drawLeverDiagram();
    updateHardnessPrediction();
    loadAllRecords();
}

document.addEventListener('DOMContentLoaded', initApp);