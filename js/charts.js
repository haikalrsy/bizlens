(function ($) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var reduced = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var uid = 0;
  
  if (!document.getElementById('gx-styles')) {
    var style = document.createElement('style');
    style.id = 'gx-styles';
    style.innerHTML = '.gx { display: block; width: 100%; height: 100%; overflow: visible; }\n' +
      '.gx-tip { position: absolute; pointer-events: none; background: rgba(255, 255, 255, 0.95); border: 1px solid #E6EBF2; border-radius: 8px; padding: 8px 12px; box-shadow: 0 4px 12px rgba(15, 76, 117, 0.1); font-family: "Inter", sans-serif; font-size: 13px; color: #1F2937; opacity: 0; transform: translate(-50%, -100%); transition: opacity 0.2s, top 0.1s, left 0.1s; z-index: 10; line-height: 1.4; }\n' +
      '.gx-tip.is-on { opacity: 1; }\n' +
      '.gx-tip b { display: block; font-weight: 600; color: #0F4C75; font-size: 14px; }\n' +
      '.gx-tip span { font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; }\n' +
      '.gx-spark { display: block; width: 100%; height: 100%; overflow: visible; }\n' +
      '.gx-donut { display: block; width: 100%; height: 100%; overflow: visible; }\n' +
      '.gx-donut-track { stroke: #E6EBF2; stroke-width: 20; fill: none; }\n' +
      '.gx-grid { stroke: #E6EBF2; stroke-width: 1; stroke-dasharray: 4 4; }\n' +
      '.gx-ax { fill: #94a3b8; font-size: 10.5px; font-family: "Inter", sans-serif; }\n' +
      '.gx-line { stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }\n' +
      '.gx-proj { stroke-width: 2.5; stroke-dasharray: 6 4; stroke-linecap: round; stroke-linejoin: round; }\n' +
      '.gx-dot { stroke: #FFF; stroke-width: 2; transition: opacity 0.2s; pointer-events: none; }';
    document.head.appendChild(style);
  }

  function el(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]);
    return n;
  }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  function animate(dur, step) {
    if (reduced) { step(1); return; }
    var t0 = performance.now();
    (function loop(now) {
      var p = Math.min(1, (now - t0) / dur);
      step(ease(p));
      if (p < 1) requestAnimationFrame(loop);
    })(t0);
  }

  /* Kurva halus (Catmull-Rom -> Bezier) agar garis tidak patah-patah */
  function smoothPath(pts) {
    if (!pts.length) return '';
    var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += 'C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ',' + c2x.toFixed(1) + ' ' +
        c2y.toFixed(1) + ',' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }

  function niceStep(range, count) {
    var raw = range / count, mag = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
  }

  /* ── Line / area chart ───────────────────────────────────── */
  function LineChart(node, opts) {
    this.$box = $(node);
    this.opts = $.extend({ pad: { t: 14, r: 14, b: 26, l: 52 }, fmt: String, grid: 4 }, opts);
    this.$box.empty();
    this.svg = el('svg', { class: 'gx', preserveAspectRatio: 'none' });
    this.$box.append(this.svg);
    this.id = 'gx' + (++uid);
    this.tip = $('<div class="gx-tip" role="status"></div>').appendTo(this.$box);
    this.bind();
  }

  LineChart.prototype.bind = function () {
    var self = this;
    this.$box.on('mousemove.gx touchmove.gx', function (e) {
      if (!self.pts) return;
      var r = self.$box[0].getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      var best = 0, dist = 1e9;
      self.pts.forEach(function (p, i) {
        var d = Math.abs(p[0] - x); if (d < dist) { dist = d; best = i; }
      });
      self.focus(best);
    }).on('mouseleave.gx touchend.gx', function () { self.focus(-1); });
  };

  LineChart.prototype.focus = function (i) {
    if (i < 0 || !this.pts) { this.tip.removeClass('is-on'); $(this.dot).attr('opacity', 0); return; }
    var p = this.pts[i], s = this.series[i];
    $(this.dot).attr({ cx: p[0], cy: p[1], opacity: 1 });
    var w = this.$box.width();
    this.tip.addClass('is-on')
      .css({ left: Math.min(Math.max(p[0], 56), w - 56), top: Math.max(p[1] - 14, 6) })
      .html('<b>' + this.opts.fmt(s.v) + '</b><span>' + s.label + '</span>');
  };

  LineChart.prototype.render = function (series, draw) {
    var self = this, o = this.opts;
    var w = this.$box.width() || 600, h = this.$box.height() || 260;
    this.series = series;
    $(this.svg).attr({ viewBox: '0 0 ' + w + ' ' + h, width: w, height: h }).empty();

    var vals = series.map(function (s) { return s.v; });
    var max = Math.max.apply(null, vals), min = Math.min.apply(null, vals);
    var span = Math.max(1, max - min);
    var lo = Math.max(0, min - span * .22), hi = max + span * .18;
    var step = niceStep(hi - lo, o.grid);
    lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;

    var iw = w - o.pad.l - o.pad.r, ih = h - o.pad.t - o.pad.b;
    var X = function (i) { return o.pad.l + (iw * i) / Math.max(1, series.length - 1); };
    var Y = function (v) { return o.pad.t + ih - ((v - lo) / (hi - lo)) * ih; };

    /* grid + sumbu nilai */
    for (var g = lo; g <= hi + .001; g += step) {
      this.svg.appendChild(el('line', { class: 'gx-grid', x1: o.pad.l, x2: w - o.pad.r, y1: Y(g), y2: Y(g) }));
      var t = el('text', { class: 'gx-ax', x: o.pad.l - 10, y: Y(g) + 4, 'text-anchor': 'end' });
      t.textContent = o.axis ? o.axis(g) : o.fmt(g);
      this.svg.appendChild(t);
    }

    /* label sumbu waktu (dijarangkan agar tidak berdesakan) */
    var every = Math.ceil(series.length / 12);
    series.forEach(function (s, i) {
      if (i % every) return;
      var t = el('text', { class: 'gx-ax', x: X(i), y: h - 6, 'text-anchor': 'middle' });
      t.textContent = s.label;
      if (s.proj) t.setAttribute('class', 'gx-ax is-proj');
      self.svg.appendChild(t);
    });

    var pts = series.map(function (s, i) { return [X(i), Y(s.v)]; });
    this.pts = pts;

    var split = series.filter(function (s) { return !s.proj; }).length;
    var solid = pts.slice(0, split), dash = pts.slice(Math.max(0, split - 1));

    /* area di bawah garis aktual */
    var grad = el('linearGradient', { id: this.id + 'f', x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.appendChild(el('stop', { offset: '0%', 'stop-color': o.color, 'stop-opacity': .18 }));
    grad.appendChild(el('stop', { offset: '100%', 'stop-color': o.color, 'stop-opacity': 0 }));
    var defs = el('defs', {}); defs.appendChild(grad); this.svg.appendChild(defs);

    var area = el('path', {
      class: 'gx-area', fill: 'url(#' + this.id + 'f)',
      d: smoothPath(solid) + 'L' + solid[solid.length - 1][0] + ' ' + (o.pad.t + ih) +
        'L' + solid[0][0] + ' ' + (o.pad.t + ih) + 'Z', opacity: 0
    });
    this.svg.appendChild(area);

    var line = el('path', { class: 'gx-line', d: smoothPath(solid), stroke: o.color, fill: 'none' });
    this.svg.appendChild(line);

    if (dash.length > 1) {
      this.svg.appendChild(el('path', {
        class: 'gx-proj', d: smoothPath(dash), stroke: o.projColor || o.color, fill: 'none'
      }));
    }

    this.dot = el('circle', { class: 'gx-dot', r: 4.5, fill: o.color, opacity: 0 });
    this.svg.appendChild(this.dot);

    var len = line.getTotalLength();
    line.style.strokeDasharray = len;
    line.style.strokeDashoffset = draw === false ? 0 : len;
    if (draw === false) { area.setAttribute('opacity', 1); return; }
    animate(700, function (p) {
      line.style.strokeDashoffset = len * (1 - p);
      area.setAttribute('opacity', p);
    });
  };

  /* ── Donut ───────────────────────────────────────────────── */
  function donut(node, parts) {
    var $n = $(node); $n.empty();
    var size = 220, r = 84, cx = size / 2, cy = size / 2, C = 2 * Math.PI * r;
    var svg = el('svg', { viewBox: '0 0 ' + size + ' ' + size, class: 'gx-donut' });
    svg.appendChild(el('circle', { class: 'gx-donut-track', cx: cx, cy: cy, r: r }));
    var acc = 0, arcs = [];
    parts.forEach(function (p) {
      var arc = el('circle', {
        cx: cx, cy: cy, r: r, fill: 'none', stroke: p.color, 'stroke-width': 20,
        'stroke-linecap': 'butt', transform: 'rotate(-90 ' + cx + ' ' + cy + ')',
        'stroke-dasharray': C, 'stroke-dashoffset': C
      });
      arc.__from = acc; arc.__len = p.share * C; acc += p.share * C;
      svg.appendChild(arc); arcs.push(arc);
    });
    $n.append(svg);
    animate(800, function (p) {
      arcs.forEach(function (a) {
        a.setAttribute('stroke-dasharray', (a.__len * p) + ' ' + C);
        a.setAttribute('stroke-dashoffset', -a.__from * p);
      });
    });
  }

  /* ── Sparkline ───────────────────────────────────────────── */
  function spark(node, vals, color) {
    var $n = $(node); $n.empty();
    var w = $n.width() || 240, h = $n.height() || 60;
    var max = Math.max.apply(null, vals), min = Math.min.apply(null, vals);
    var pts = vals.map(function (v, i) {
      return [(w * i) / (vals.length - 1), h - 4 - ((v - min) / Math.max(1, max - min)) * (h - 12)];
    });
    var svg = el('svg', { viewBox: '0 0 ' + w + ' ' + h, class: 'gx gx-spark' });
    var id = 'sp' + (++uid);
    var grad = el('linearGradient', { id: id, x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.appendChild(el('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': .22 }));
    grad.appendChild(el('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': 0 }));
    var defs = el('defs', {}); defs.appendChild(grad); svg.appendChild(defs);
    svg.appendChild(el('path', {
      d: smoothPath(pts) + 'L' + w + ' ' + h + 'L0 ' + h + 'Z', fill: 'url(#' + id + ')'
    }));
    var line = el('path', { d: smoothPath(pts), fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linecap': 'round' });
    svg.appendChild(line);
    $n.append(svg);
    var len = line.getTotalLength();
    line.style.strokeDasharray = len; line.style.strokeDashoffset = len;
    animate(700, function (p) { line.style.strokeDashoffset = len * (1 - p); });
  }

  window.BizCharts = { Line: LineChart, donut: donut, spark: spark, animate: animate };
})(jQuery); 
