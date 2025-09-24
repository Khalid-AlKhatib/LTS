// Lightweight content loader for Tools, News, and Positions
// Requires existing DOM sections with known containers.

(function () {
  function $(selector, root) {
    return (root || document).querySelector(selector);
  }
  function $all(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  // Determine base prefix for subpages ('' on root, '../' in nested pages)
  var DATA_BASE_PREFIX = (function () {
    // Heuristic: CSS link path on subpages starts with '../'
    var cssLink = $('link[href^="../css/"]');
    return cssLink ? '../' : '';
  })();

  function dataUrl(file) {
    return DATA_BASE_PREFIX + 'data/' + file;
  }

  function fetchJson(path) {
    return fetch(path, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('Failed to load ' + path);
      return res.json();
    });
  }

  // Tools
  function renderTools(tools) {
    var bar = $('.link-bar');
    if (!bar || !Array.isArray(tools)) return;
    bar.innerHTML = tools.map(function (t) {
      var icon = '';
      if (t.iconType === 'svg' && t.iconSvg) {
        icon = t.iconSvg;
      } else if (t.iconUrl) {
        icon = '<img src="' + t.iconUrl + '" alt="' + (t.label || '') + ' Logo">';
      }
      return '<a class="tool-link" href="' + t.url + '" target="_blank" rel="noopener noreferrer">' + icon + (t.label || '') + '</a>';
    }).join('');
  }

  // News (tabbed years with list format)
  function renderNewsForYear(year, newsData) {
    var container = document.getElementById('news-list-' + year);
    if (!container) return;
    var list = Array.isArray(newsData[year]) ? newsData[year] : [];
    container.innerHTML = list.map(function (item) {
      var href = item.url || '#';
      var target = item.url ? ' target="_blank" rel="noopener noreferrer"' : '';
      return (
        '<li>' +
          '<a href="' + href + '" class="news-item"' + target + '>' +
            '<p class="news-item-date text-muted fs-12 m-0">' + (item.date || '') + '</p>' +
            '<h5 class="news-item-title">' + (item.title || '') + '</h5>' +
            '<p class="news-item-description">' + (item.desc || '') + '</p>' +
          '</a>' +
        '</li>'
      );
    }).join('');
  }

  function wireNewsTabs(newsData) {
    var tabBtns = $all('#newsTab button');
    if (!tabBtns.length) return;
    tabBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var yr = btn.getAttribute('data-year');
        // activate tab
        var active = $('#newsTab .active');
        if (active) active.classList.remove('active');
        btn.classList.add('active');
        // show content
        $all('.tab-pane').forEach(function (p) { p.classList.remove('show', 'active'); });
        var pane = document.getElementById('news' + yr);
        if (pane) pane.classList.add('show', 'active');
        // render
        renderNewsForYear(yr, newsData);
      });
    });
    // initial render for all available years
    Object.keys(newsData || {}).forEach(function (year) {
      renderNewsForYear(year, newsData);
    });
  }

  // News fallback: single list (.news-list)
  function renderNewsListFallback(newsData) {
    var ul = $('.news-list');
    if (!ul) return;
    // Flatten all years into one list, years sorted desc, keeping item order per year
    var years = Object.keys(newsData || {});
    if (!years.length) return;
    years.sort(function (a, b) {
      var na = parseInt(a, 10), nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return nb - na;
      return a < b ? 1 : -1;
    });
    var items = [];
    years.forEach(function (yr) {
      var arr = Array.isArray(newsData[yr]) ? newsData[yr] : [];
      arr.forEach(function (it) { items.push(it); });
    });
    ul.innerHTML = items.map(function (item) {
      var href = item.url || '#';
      var target = item.url ? ' target="_blank" rel="noopener noreferrer"' : '';
      return (
        '<li>' +
          '<a href="' + href + '" class="news-item"' + target + '>' +
            '<p class="news-item-date text-muted fs-12 m-0">' + (item.date || '') + '</p>' +
            '<h5 class="news-item-title">' + (item.title || '') + '</h5>' +
            '<p class="news-item-description">' + (item.desc || '') + '</p>' +
          '</a>' +
        '</li>'
      );
    }).join('');
  }

  // Positions
  function renderPositions(positions) {
    var listRoot = $('.open-positions ul.list-unstyled');
    if (!listRoot || !Array.isArray(positions)) return;
    listRoot.innerHTML = positions.map(function (pos) {
      return (
        '<li class="mb-3">' +
          '<a href="' + (pos.url || '#') + '" class="open-position d-flex p-4" target="' + (pos.url ? '_blank' : '_self') + '" rel="noopener noreferrer">' +
            '<div class="open-position-icon"><i class="mdi mdi-briefcase fs-20"></i></div>' +
            '<div class="open-position-content ps-3">' +
              '<h5 class="open-position-title mb-2">' + (pos.title || '') + '</h5>' +
              '<p class="open-position-description m-0">' + (pos.desc || '') + '</p>' +
            '</div>' +
          '</a>' +
        '</li>'
      );
    }).join('');
  }

  function init() {
    // Tools
    fetchJson(dataUrl('tools.json')).then(renderTools).catch(function () {});

    // News
    var newsTab = $('#newsTab');
    fetchJson(dataUrl('news.json')).then(function (newsData) {
      if (newsTab) {
        wireNewsTabs(newsData);
      } else {
        renderNewsListFallback(newsData);
      }
    }).catch(function () {});

    // Positions
    if ($('.open-positions')) {
      fetchJson(dataUrl('positions.json')).then(renderPositions).catch(function () {});
    }

    // Research page content
    if ($('#themesAccordion') || $('#projectsAccordion') || $('#topicsAccordion')) {
      fetchJson(dataUrl('research.json')).then(function (research) {
        try { renderResearch(research); } catch (e) {}
      }).catch(function () {});
    }

    // Members page content
    if ($('#members')) {
      fetchJson(dataUrl('members.json')).then(function (members) {
        try { renderMembers(members); } catch (e) {}
      }).catch(function () {});
    }

    // Teaching page content
    if ($('#teachingTab')) {
      fetchJson(dataUrl('teaching.json')).then(function (teaching) {
        try { renderTeaching(teaching); } catch (e) {}
      }).catch(function () {});
    }

    // Theme persistence (apply stored theme on load)
    try {
      var theme = localStorage.getItem('theme');
      if (theme === 'dark') {
        document.body.setAttribute('data-layout-mode', 'dark');
      } else if (theme === 'light') {
        document.body.removeAttribute('data-layout-mode');
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// -------- Renderers for subpages --------

function renderResearch(data) {
  function renderAccordion(containerSelector, items, idPrefix) {
    var root = document.querySelector(containerSelector);
    if (!root || !Array.isArray(items)) return;
    root.innerHTML = items.map(function (item, idx) {
      var hid = idPrefix + 'Heading' + idx;
      var cid = idPrefix + idx;
      var alt = (item.title || '').replace(/"/g, '&quot;');
      return (
        '<div class="accordion-item">' +
          '<h2 class="accordion-header" id="' + hid + '">' +
            '<button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#' + cid + '" aria-expanded="false" aria-controls="' + cid + '">' +
              (item.img ? '<img src="' + item.img + '" alt="' + alt + '" class="accordion-thumb me-2">' : '') +
              '<span>' + (item.title || '') + '</span>' +
            '</button>' +
          '</h2>' +
          '<div id="' + cid + '" class="accordion-collapse collapse" aria-labelledby="' + hid + '" data-bs-parent="' + containerSelector + '">' +
            '<div class="accordion-body">' + (item.desc || '') + '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  renderAccordion('#themesAccordion', data.themes || [], 'theme');
  renderAccordion('#projectsAccordion', data.projects || [], 'project');
  renderAccordion('#topicsAccordion', data.thesisTopics || [], 'topic');
}

function renderMembers(data) {
  function card(item) {
    var interestsHtml = '';
    if (Array.isArray(item.interests) && item.interests.length) {
      interestsHtml = '<ul>' + item.interests.map(function (t) { return '<li> ' + t + '</li>'; }).join('') + '</ul>';
    }
    var profile = item.profileUrl ? '<a href="' + item.profileUrl + '" class="text-primary border-2 border-primary border-bottom">View Profile <img src="images/home/right-arrow-primary.png" alt="" class="img-fluid mb-1 ms-2"></a>' : '';
    var phoneHtml = item.phone ? '<p class="member-phone mb-2"><i class="mdi mdi-phone text-primary"></i> Phone: <a href="tel:' + item.phone + '">' + item.phone + '</a></p>' : '';
    var emailHtml = item.email ? '<p class="member-email mb-2"><i class="mdi mdi-email text-primary"></i> Email: <a href="mailto:' + item.email + '">' + item.email + '</a></p>' : '';
    return (
      '<div class="member mt-4 p-4">' +
        '<div class="row gy-4 gx-4 gx-xl-5">' +
          '<div class="member-left-col col-12 col-md-4 col-xl-3">' +
            '<div class="member-image">' +
              (item.image ? '<img src="' + item.image + '" alt="' + (item.name || '') + '">' : '') +
            '</div>' +
          '</div>' +
          '<div class="member-right-col col-12 col-md-8 col-xl-9">' +
            '<div class="member-content d-flex flex-column h-100">' +
              '<div>' +
                '<h4 class="member-name mb-4">' + (item.name || '') + '</h4>' +
                '<div class="row mb-4">' +
                  '<div class="col-12 col-md-6">' +
                    '<p class="member-interest mb-2"><i class="mdi mdi-test-tube text-primary"></i> Research Interest:' + interestsHtml + '</p>' +
                    phoneHtml +
                    emailHtml +
                  '</div>' +
                  '<div class="col-12 col-md-6">' +
                    (item.address ? '<p class="member-address mb-2"><i class="mdi mdi-map-marker text-primary"></i> Address: <span>' + item.address + '</span></p>' : '') +
                    (item.building ? '<p class="member-building mb-2"><i class="mdi mdi-office-building text-primary"></i> Building: <span>' + item.building + '</span></p>' : '') +
                    (item.room ? '<p class="member-roommb-2"><i class="mdi mdi-door text-primary"></i> Room: <span>' + item.room + '</span></p>' : '') +
                  '</div>' +
                '</div>' +
              '</div>' +
              '<div class="mt-auto text-right">' + profile + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  // Render All members (Faculty + PhD)
  var allRoot = document.getElementById('allmembers');
  if (allRoot) {
    var allMembers = [];
    if (Array.isArray(data.faculty)) {
      allMembers = allMembers.concat(data.faculty);
    }
    if (Array.isArray(data.phd)) {
      allMembers = allMembers.concat(data.phd);
    }
    allRoot.innerHTML = allMembers.map(card).join('');
  }

  // Render Faculty members
  var profRoot = document.getElementById('profmembers');
  if (profRoot && Array.isArray(data.faculty)) {
    profRoot.innerHTML = data.faculty.map(card).join('');
  }
  
  // Render PhD members
  var phdRoot = document.getElementById('phdmembers');
  if (phdRoot && Array.isArray(data.phd)) {
    phdRoot.innerHTML = data.phd.map(card).join('');
  }
}

function renderTeaching(data) {
  Object.keys(data || {}).forEach(function (year) {
    var row = document.querySelector('#teaching' + year + ' .row');
    if (!row) return;
    var items = Array.isArray(data[year]) ? data[year] : [];
    row.innerHTML = items.map(function (c) {
      var iconCls = (c.icon || 'mdi mdi-book') + ' fs-24 ' + (c.iconColor || 'text-primary');
      return (
        '<div class="col-lg-6">' +
          '<a href="' + (c.url || '#') + '" class="info-item d-block text-body mt-4 pt-2" target="_blank" rel="noopener noreferrer">' +
            '<div class="p-4">' +
              '<div class="research avatar-sm bg-soft-purple text-center">' +
                '<i class="' + iconCls + '"></i>' +
              '</div>' +
              '<h6 class="mt-4">' + (c.title || '') + '</h6>' +
              '<p class="text-muted fs-15">' + (c.desc || '') + '</p>' +
            '</div>' +
          '</a>' +
        '</div>'
      );
    }).join('');
  });
}


