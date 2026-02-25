// ===== CHARTS JS — Canvas-based bar & line charts =====

function drawBarChart(canvasId, labels, values, color = '#c8860a') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.parentElement.clientWidth;
    const H = canvas.height = 200;
    ctx.clearRect(0, 0, W, H);

    if (!values.length) {
        ctx.fillStyle = 'rgba(100,110,130,0.5)';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('No data yet', W / 2, H / 2);
        return;
    }

    const padLeft = 40, padRight = 20, padTop = 20, padBottom = 40;
    const chartW = W - padLeft - padRight;
    const chartH = H - padTop - padBottom;
    const maxVal = Math.max(...values, 1);
    const barW = Math.min(chartW / values.length - 8, 50);

    // Grid lines
    ctx.strokeStyle = 'rgba(0,0,0,0.07)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padTop + (chartH / 4) * i;
        ctx.beginPath(); ctx.moveTo(padLeft, y); ctx.lineTo(W - padRight, y); ctx.stroke();
    }

    // Y axis labels
    ctx.fillStyle = 'rgba(80,95,115,0.75)';
    ctx.font = '10px Inter';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
        const y = padTop + (chartH / 4) * i;
        const v = Math.round(maxVal - (maxVal / 4) * i);
        ctx.fillText(v, padLeft - 6, y + 4);
    }

    const step = chartW / values.length;
    values.forEach((val, i) => {
        const x = padLeft + i * step + step / 2 - barW / 2;
        const barH = (val / maxVal) * chartH;
        const y = padTop + chartH - barH;

        // Gradient bar
        const grad = ctx.createLinearGradient(0, y, 0, padTop + chartH);
        grad.addColorStop(0, color);
        grad.addColorStop(1, color + '33');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
        ctx.fill();

        // Value on top
        if (val > 0) {
            ctx.fillStyle = 'rgba(50,60,80,0.85)';
            ctx.font = '10px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(val, x + barW / 2, y - 4);
        }

        // Label
        ctx.fillStyle = 'rgba(80,95,115,0.65)';
        ctx.font = '9px Inter';
        ctx.textAlign = 'center';
        const lbl = labels[i] ? labels[i].toString().slice(0, 6) : '';
        ctx.fillText(lbl, x + barW / 2, H - padBottom + 16);
    });
}

function drawLineChart(canvasId, labels, values, color = '#1a9b75') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.parentElement.clientWidth;
    const H = canvas.height = 200;
    ctx.clearRect(0, 0, W, H);

    if (!values.length) {
        ctx.fillStyle = 'rgba(100,110,130,0.5)';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('No data yet', W / 2, H / 2);
        return;
    }

    const padLeft = 40, padRight = 20, padTop = 20, padBottom = 40;
    const chartW = W - padLeft - padRight;
    const chartH = H - padTop - padBottom;
    const maxVal = Math.max(...values, 1);

    // Grid lines
    ctx.strokeStyle = 'rgba(0,0,0,0.07)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padTop + (chartH / 4) * i;
        ctx.beginPath(); ctx.moveTo(padLeft, y); ctx.lineTo(W - padRight, y); ctx.stroke();
    }

    // Y axis
    ctx.fillStyle = 'rgba(80,95,115,0.75)';
    ctx.font = '10px Inter';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
        const y = padTop + (chartH / 4) * i;
        const v = Math.round(maxVal - (maxVal / 4) * i);
        ctx.fillText(v, padLeft - 6, y + 4);
    }

    const step = values.length > 1 ? chartW / (values.length - 1) : chartW;
    const pts = values.map((v, i) => ({
        x: padLeft + i * step,
        y: padTop + chartH - (v / maxVal) * chartH
    }));

    // Fill area
    const areaGrad = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
    areaGrad.addColorStop(0, color + '44');
    areaGrad.addColorStop(1, color + '00');
    ctx.beginPath();
    ctx.moveTo(pts[0].x, padTop + chartH);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, padTop + chartH);
    ctx.closePath();
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
        const cp1x = (pts[i - 1].x + pts[i].x) / 2;
        ctx.bezierCurveTo(cp1x, pts[i - 1].y, cp1x, pts[i].y, pts[i].x, pts[i].y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Dots + values
    pts.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (values[i] > 0) {
            ctx.fillStyle = 'rgba(40,55,75,0.9)';
            ctx.font = 'bold 10px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(values[i], p.x, p.y - 10);
        }

        ctx.fillStyle = 'rgba(80,95,115,0.65)';
        ctx.font = '9px Inter';
        ctx.textAlign = 'center';
        const lbl = labels[i] ? labels[i].toString().slice(0, 5) : '';
        ctx.fillText(lbl, p.x, H - padBottom + 16);
    });
}
