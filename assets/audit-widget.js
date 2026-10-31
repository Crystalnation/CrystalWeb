(function(){
  var PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
  var PSI_API_KEY = 'AIzaSyADeZXFCV7Ymv_5RBhUxXpcj5q91kV0Nsc'; // Google Cloud API key, restricted to PageSpeed Insights API + crystalweb.tech referrers
  var LEAD_EMAIL = 'crystalnation15@gmail.com';
  var FORM_ENDPOINT = 'https://formsubmit.co/ajax/' + LEAD_EMAIL;

  var state = { lastResult: null, lastUrl: '' };

  function $(id){ return document.getElementById(id); }

  function open(){
    renderStep1();
    $('cw-audit-modal').classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function close(){
    $('cw-audit-modal').classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function normalizeUrl(raw){
    raw = (raw || '').trim();
    if(!raw) return null;
    if(!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
    try{ new URL(raw); return raw; }catch(e){ return null; }
  }

  function showError(id, msg){
    var el = $(id);
    if(!el) return;
    el.textContent = msg;
    el.style.display = 'block';
  }

  function renderStep1(){
    $('cw-audit-content').innerHTML = ''
      + '<div class="cw-audit-badge">FREE TOOL</div>'
      + '<h3 class="cw-audit-h">Free Website Audit</h3>'
      + '<p class="cw-audit-sub">Enter your website and get a real SEO, speed, and technical health score in under a minute.</p>'
      + '<form id="cw-audit-form" class="cw-audit-form">'
      +   '<input type="text" id="cw-audit-url" class="cw-audit-input" placeholder="yourwebsite.com" required>'
      +   '<button type="submit" class="cw-audit-btn-primary">Analyze My Site</button>'
      + '</form>'
      + '<div id="cw-audit-error" class="cw-audit-error" style="display:none;"></div>'
      + '<p class="cw-audit-fine">Checks real, public signals (page speed, SEO health, mobile-friendliness) via Google’s own PageSpeed Insights engine. We don’t access private data like your analytics or order history.</p>';

    $('cw-audit-form').addEventListener('submit', function(e){
      e.preventDefault();
      var url = normalizeUrl($('cw-audit-url').value);
      if(!url){ showError('cw-audit-error', 'Enter a valid website address, e.g. yourstore.com'); return; }
      runAudit(url);
    });
  }

  function renderLoading(url){
    var msgs = ['Checking SEO signals…', 'Measuring page speed…', 'Scoring mobile-friendliness…', 'Reviewing technical health…'];
    $('cw-audit-content').innerHTML = ''
      + '<div class="cw-audit-loading">'
      +   '<div class="cw-audit-spinner"></div>'
      +   '<p id="cw-audit-loading-text" class="cw-audit-loading-text">' + msgs[0] + '</p>'
      +   '<p class="cw-audit-loading-url"></p>'
      + '</div>';
    $('cw-audit-content').querySelector('.cw-audit-loading-url').textContent = url;
    var i = 0;
    var iv = setInterval(function(){
      i = (i + 1) % msgs.length;
      var t = $('cw-audit-loading-text');
      if(t) t.textContent = msgs[i]; else clearInterval(iv);
    }, 2200);
    return function(){ clearInterval(iv); };
  }

  function runAudit(url){
    var stopLoading = renderLoading(url);
    var api = PSI_ENDPOINT + '?url=' + encodeURIComponent(url)
      + '&strategy=mobile'
      + '&category=performance&category=seo&category=best-practices&category=accessibility'
      + (PSI_API_KEY ? '&key=' + encodeURIComponent(PSI_API_KEY) : '');

    fetch(api).then(function(r){
      if(!r.ok) throw new Error('psi-' + r.status);
      return r.json();
    }).then(function(data){
      stopLoading();
      if(!data || !data.lighthouseResult) throw new Error('no-result');
      state.lastResult = data;
      state.lastUrl = url;
      renderResults(data, url);
    }).catch(function(err){
      stopLoading();
      renderStep1();
      var m = 'Could not analyze that site. ';
      if(String(err.message).indexOf('psi-429') >= 0) m += 'Too many checks right now — try again in a minute.';
      else m += 'Double check the URL and that the site is public, then try again.';
      showError('cw-audit-error', m);
    });
  }

  function scoreOf(cat){
    var c = state.lastResult.lighthouseResult.categories[cat];
    return c && c.score != null ? Math.round(c.score * 100) : null;
  }

  function scoreColor(score){
    if(score == null) return '#999';
    if(score >= 90) return '#1E8E3E';
    if(score >= 50) return '#E8A33D';
    return '#E53935';
  }

  function topIssues(data, limit){
    var cats = data.lighthouseResult.categories;
    var audits = data.lighthouseResult.audits;
    var picked = [];
    ['seo', 'performance', 'best-practices', 'accessibility'].forEach(function(catKey){
      var cat = cats[catKey];
      if(!cat || !cat.auditRefs) return;
      cat.auditRefs.forEach(function(ref){
        var a = audits[ref.id];
        if(!a) return;
        if(a.scoreDisplayMode === 'notApplicable' || a.scoreDisplayMode === 'informative') return;
        if(a.score == null || a.score >= 0.9) return;
        picked.push({ id: a.id, title: a.title, description: a.description || '', score: a.score, weight: ref.weight || 0 });
      });
    });
    picked.sort(function(a, b){ return (a.score - b.score) || (b.weight - a.weight); });
    var seen = {}; var out = [];
    picked.forEach(function(p){
      if(out.length < limit && !seen[p.id]){ seen[p.id] = 1; out.push(p); }
    });
    return out;
  }

  function cleanDescription(desc){
    return desc.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  }

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  function renderResults(data, url){
    var perf = scoreOf('performance'), seo = scoreOf('seo'), bp = scoreOf('best-practices'), a11y = scoreOf('accessibility');
    var vals = [perf, seo, bp, a11y].filter(function(v){ return v != null; });
    var overall = vals.length ? Math.round(vals.reduce(function(s, v){ return s + v; }, 0) / vals.length) : null;
    var issues = topIssues(data, 5);

    var gauges = [
      { label: 'Performance', val: perf },
      { label: 'SEO / Ranking Readiness', val: seo },
      { label: 'Best Practices', val: bp },
      { label: 'Accessibility', val: a11y }
    ].map(function(g){
      return '<div class="cw-audit-gauge">'
        + '<div class="cw-audit-gauge-ring" style="--p:' + (g.val || 0) + ';--c:' + scoreColor(g.val) + '">'
        +   '<span>' + (g.val != null ? g.val : '–') + '</span>'
        + '</div>'
        + '<div class="cw-audit-gauge-label">' + g.label + '</div>'
      + '</div>';
    }).join('');

    var issuesHtml = issues.length ? issues.map(function(i){
      var d = cleanDescription(i.description);
      if(d.length > 120) d = d.slice(0, 120) + '…';
      return '<li><strong>' + escapeHtml(i.title) + '</strong><span>' + escapeHtml(d) + '</span></li>';
    }).join('') : '<li class="cw-audit-clean">No major issues found — nice work.</li>';

    $('cw-audit-content').innerHTML = ''
      + '<div class="cw-audit-badge">RESULTS</div>'
      + '<h3 class="cw-audit-h">Your site scores ' + (overall != null ? overall : '–') + '/100</h3>'
      + '<p class="cw-audit-sub"></p>'
      + '<div class="cw-audit-gauges">' + gauges + '</div>'
      + '<p class="cw-audit-issues-label">Top things to fix</p>'
      + '<ul class="cw-audit-issues">' + issuesHtml + '</ul>'
      + '<div class="cw-audit-cta">'
      +   '<p>Get the full report as a PDF — includes every check and what to fix first.</p>'
      +   '<form id="cw-audit-email-form" class="cw-audit-form">'
      +     '<input type="email" id="cw-audit-email" class="cw-audit-input" placeholder="you@email.com" required>'
      +     '<button type="submit" class="cw-audit-btn-primary">Email Me the Report</button>'
      +   '</form>'
      +   '<div id="cw-audit-email-error" class="cw-audit-error" style="display:none;"></div>'
      + '</div>';

    $('cw-audit-content').querySelector('.cw-audit-sub').textContent = url;

    $('cw-audit-email-form').addEventListener('submit', function(e){
      e.preventDefault();
      var email = $('cw-audit-email').value.trim();
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
        showError('cw-audit-email-error', 'Enter a valid email address.');
        return;
      }
      deliverReport(email, url, { perf: perf, seo: seo, bp: bp, a11y: a11y, overall: overall, issues: issues });
    });
  }

  function buildCsv(meta){
    var rows = [['Metric', 'Score']];
    rows.push(['Overall', meta.overall]);
    rows.push(['Performance', meta.perf]);
    rows.push(['SEO / Ranking Readiness', meta.seo]);
    rows.push(['Best Practices', meta.bp]);
    rows.push(['Accessibility', meta.a11y]);
    rows.push([]);
    rows.push(['Issue', 'Details']);
    meta.issues.forEach(function(i){ rows.push([i.title, cleanDescription(i.description).replace(/\n/g, ' ')]); });
    return rows.map(function(r){
      return r.map(function(c){
        c = String(c == null ? '' : c);
        if(/[",\n]/.test(c)) c = '"' + c.replace(/"/g, '""') + '"';
        return c;
      }).join(',');
    }).join('\n');
  }

  function hostFrom(url){
    try{ return new URL(url).hostname.replace(/^www\./, ''); }catch(e){ return 'report'; }
  }

  function buildPdf(url, meta){
    var jsPDFCtor = window.jspdf && window.jspdf.jsPDF;
    if(!jsPDFCtor) return null;
    var doc = new jsPDFCtor({ unit: 'pt', format: 'a4' });
    var pageW = doc.internal.pageSize.getWidth();
    var y;

    doc.setFillColor(229, 57, 53);
    doc.rect(0, 0, pageW, 64, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
    doc.text('CrystalWeb — Website Audit Report', 40, 40);

    y = 96;
    doc.setTextColor(23, 23, 23);
    doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    doc.text('Site audited: ' + url, 40, y); y += 16;
    doc.text('Date: ' + new Date().toLocaleDateString(), 40, y); y += 28;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text('Overall score: ' + (meta.overall != null ? meta.overall : '-') + ' / 100', 40, y); y += 24;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    [
      ['Performance', meta.perf], ['SEO / Ranking Readiness', meta.seo],
      ['Best Practices', meta.bp], ['Accessibility', meta.a11y]
    ].forEach(function(row){
      doc.text(row[0] + ':', 40, y);
      doc.text(String(row[1] != null ? row[1] : '-') + ' / 100', 260, y);
      y += 18;
    });

    y += 16;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text('Top things to fix', 40, y); y += 20;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);

    if(!meta.issues.length){
      doc.text('No major issues found.', 40, y); y += 14;
    }
    meta.issues.forEach(function(i){
      var lines = doc.splitTextToSize('• ' + i.title + ' — ' + cleanDescription(i.description), pageW - 80);
      lines.forEach(function(line){
        if(y > 760){ doc.addPage(); y = 48; }
        doc.text(line, 40, y); y += 14;
      });
      y += 6;
    });

    y += 20;
    if(y > 740){ doc.addPage(); y = 48; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('Want these fixed? Talk to CrystalWeb.', 40, y); y += 16;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text('crystalweb.tech  ·  WhatsApp +234 916 231 3251  ·  crystalnation15@gmail.com', 40, y);

    return doc;
  }

  function downloadBlob(blob, filename){
    var a = document.createElement('a');
    var href = URL.createObjectURL(blob);
    a.href = href; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(href); }, 1000);
  }

  function deliverReport(email, url, meta){
    var btn = document.querySelector('#cw-audit-email-form button');
    if(btn){ btn.disabled = true; btn.textContent = 'Preparing your report…'; }

    var doc = buildPdf(url, meta);
    var csv = buildCsv(meta);
    var fileBase = 'crystalweb-audit-' + hostFrom(url);

    if(doc) doc.save(fileBase + '.pdf');
    downloadBlob(new Blob([csv], { type: 'text/csv' }), fileBase + '.csv');

    var fd = new FormData();
    fd.append('_subject', 'New website audit lead: ' + url);
    fd.append('email', email);
    fd.append('audited_url', url);
    fd.append('overall_score', meta.overall);
    fd.append('performance', meta.perf);
    fd.append('seo', meta.seo);
    fd.append('best_practices', meta.bp);
    fd.append('accessibility', meta.a11y);
    fd.append('_autoresponse', 'Thanks for running a free audit with CrystalWeb! Your site scored ' + meta.overall + '/100. Your full PDF report has downloaded to your device — check your downloads. Want help fixing what we found? Just reply to this email.');
    fd.append('_captcha', 'false');
    if(doc) fd.append('report', doc.output('blob'), fileBase + '.pdf');

    fetch(FORM_ENDPOINT, { method: 'POST', body: fd, headers: { 'Accept': 'application/json' } })
      .then(function(){ showDone(); })
      .catch(function(){ showDone(); });
  }

  function showDone(){
    $('cw-audit-content').innerHTML = ''
      + '<div class="cw-audit-badge">DONE</div>'
      + '<h3 class="cw-audit-h">Your report is downloading</h3>'
      + '<p class="cw-audit-sub">Check your device’s downloads for the PDF and CSV. We’ve also sent your results to our team — expect a note if there’s a quick win we can help with.</p>'
      + '<button type="button" class="cw-audit-btn-primary" onclick="CWAudit.close()">Close</button>';
  }

  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){
      var m = $('cw-audit-modal');
      if(m && m.classList.contains('is-open')) close();
    }
  });

  window.CWAudit = { open: open, close: close };
})();
