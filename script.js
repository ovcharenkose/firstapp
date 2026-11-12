// ===== Регистрация Service Worker =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('SW registered'))
      .catch((err) => console.warn('SW error:', err));
  });
}

// ===== Календарь =====
(function () {
  const grid = document.getElementById('calGrid');
  if (!grid) return;

  const dayModal = document.getElementById('dayModal');
  const notesModal = document.getElementById('notesModal');
  const finishModal = document.getElementById('finishModal');

  const modalDayTitle = document.getElementById('modalDayTitle');
  const notesDayTitle = document.getElementById('notesDayTitle');
  const notesInput = document.getElementById('notesInput');
  const finishStats = document.getElementById('finishStats');
  const viewBtn = document.getElementById('viewNotesBtn');

  let currentMonthKey = 'cyl-month-current';
  let currentDay = null;

  function loadMonth() {
    const raw = localStorage.getItem(currentMonthKey);
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    return { days: {}, finished: false, startedAt: Date.now() };
  }

  function saveMonth(data) {
    localStorage.setItem(currentMonthKey, JSON.stringify(data));
  }

  let month = loadMonth();

  function render() {
    grid.innerHTML = '';
    for (let i = 1; i <= 30; i++) {
      const cell = document.createElement('div');
      cell.className = 'cal-cell';
      cell.dataset.day = i;

      const state = month.days[i];
      if (state === 'done') cell.classList.add('done');
      if (state === 'skip') cell.classList.add('skip');

      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = i;
      cell.appendChild(num);

      if (state) {
        const emoji = document.createElement('span');
        emoji.className = 'emoji';
        emoji.textContent = state === 'done' ? '😇' : '😒';
        cell.appendChild(emoji);
      }

      cell.addEventListener('click', () => openDay(i));
      grid.appendChild(cell);
    }
  }

  function openDay(day) {
    currentDay = day;
    modalDayTitle.textContent = 'Day ' + day;

    // Проверяем, есть ли заметка для этого дня
    const hasNote = month.notes && month.notes[day] && month.notes[day].trim() !== '';
    if (viewBtn) {
      viewBtn.style.display = hasNote ? 'block' : 'none';
    }

    dayModal.classList.add('active');
  }

  // Закрыть модалку дня
  document.getElementById('closeDayModal').addEventListener('click', () => {
    dayModal.classList.remove('active');
  });

  // Кнопка "Выполнено"
  document.getElementById('doneBtn').addEventListener('click', () => {
    month.days[currentDay] = 'done';
    saveMonth(month);
    render();
    dayModal.classList.remove('active');
  });

  // Кнопка "Пропуск"
  document.getElementById('skipBtn').addEventListener('click', () => {
    month.days[currentDay] = 'skip';
    saveMonth(month);
    render();
    dayModal.classList.remove('active');
  });

  // Кнопка "Заметки дня" (редактирование)
  document.getElementById('notesBtn').addEventListener('click', () => {
    dayModal.classList.remove('active');
    notesDayTitle.textContent = 'Day ' + currentDay;
    notesInput.value = (month.notes && month.notes[currentDay]) || '';
    notesInput.readOnly = false;
    notesModal.classList.add('active');
  });

  // Кнопка "Посмотреть заметки" (только чтение)
  if (viewBtn) {
    viewBtn.addEventListener('click', () => {
      dayModal.classList.remove('active');
      notesDayTitle.textContent = 'Day ' + currentDay;
      notesInput.value = (month.notes && month.notes[currentDay]) || '';
      notesInput.readOnly = true;
      notesModal.classList.add('active');
    });
  }

  // Сохранение заметок
  document.getElementById('saveNotes').addEventListener('click', () => {
    if (!month.notes) month.notes = {};
    month.notes[currentDay] = notesInput.value;
    saveMonth(month);
    notesModal.classList.remove('active');
    notesInput.readOnly = false;
  });

  // Закрыть модалку заметок
  document.getElementById('closeNotesModal').addEventListener('click', () => {
    notesModal.classList.remove('active');
    notesInput.readOnly = false;
  });

  // Кнопка "✓" (завершить месяц)
  document.getElementById('finishBtn').addEventListener('click', () => {
    let done = 0, skip = 0;
    for (let i = 1; i <= 30; i++) {
      if (month.days[i] === 'done') done++;
      if (month.days[i] === 'skip') skip++;
    }
    finishStats.textContent = 'Выполнено: ' + done + ' / Пропущено: ' + skip;
    finishModal.classList.add('active');
  });

  // Стрелка "назад" в модалке завершения
  document.getElementById('finishBack').addEventListener('click', (e) => {
    e.preventDefault();
    finishModal.classList.remove('active');
  });

  // Кнопка "+30 дней"
  document.getElementById('nextMonthBtn').addEventListener('click', () => {
    const archive = JSON.parse(localStorage.getItem('cyl-archive') || '[]');
    month.finished = true;
    month.finishedAt = Date.now();
    archive.push(month);
    localStorage.setItem('cyl-archive', JSON.stringify(archive));

    month = { days: {}, finished: false, startedAt: Date.now() };
    saveMonth(month);
    render();
    finishModal.classList.remove('active');
  });

  // Кнопка "Cal" → страница года
  document.getElementById('yearBtn').addEventListener('click', () => {
    window.location.href = 'year.html';
  });

  render();
})();


// ===== Страница года =====
(function () {
  const yearList = document.getElementById('yearList');
  if (!yearList) return;

  const modal = document.getElementById('monthViewModal');
  const modalTitle = document.getElementById('monthViewTitle');
  const modalStats = document.getElementById('monthViewStats');
  const modalGrid = document.getElementById('monthViewGrid');

  const notesModal = document.getElementById('yearNotesModal');
  const notesTitle = document.getElementById('yearNotesTitle');
  const notesText = document.getElementById('yearNotesText');

  const archive = JSON.parse(localStorage.getItem('cyl-archive') || '[]');

  if (archive.length === 0) {
    yearList.innerHTML = '<div class="year-empty">Пока нет завершённых месяцев</div>';
    return;
  }

  archive.sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

  archive.forEach((month, index) => {
    let done = 0, skip = 0;
    for (let i = 1; i <= 30; i++) {
      if (month.days[i] === 'done') done++;
      if (month.days[i] === 'skip') skip++;
    }

    const item = document.createElement('div');
    item.className = 'year-item';
    item.innerHTML =
      '<span class="yi-title">Месяц ' + (archive.length - index) + '</span>' +
      '<span class="yi-badge">😇 ' + done + ' / 😒 ' + skip + '</span>';

    item.addEventListener('click', () => openMonth(month, archive.length - index));
    yearList.appendChild(item);
  });

  function openMonth(month, number) {
    modalTitle.textContent = 'Месяц ' + number;

    let done = 0, skip = 0;
    for (let i = 1; i <= 30; i++) {
      if (month.days[i] === 'done') done++;
      if (month.days[i] === 'skip') skip++;
    }
    modalStats.textContent = 'Выполнено: ' + done + ' / Пропущено: ' + skip;

    modalGrid.innerHTML = '';
    for (let i = 1; i <= 30; i++) {
      const cell = document.createElement('div');
      cell.className = 'cal-cell';
      const state = month.days[i];
      if (state === 'done') cell.classList.add('done');
      if (state === 'skip') cell.classList.add('skip');

      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = i;
      cell.appendChild(num);

      if (state) {
        const emoji = document.createElement('span');
        emoji.className = 'emoji';
        emoji.textContent = state === 'done' ? '😇' : '😒';
        cell.appendChild(emoji);
      }

      // Если есть заметка — делаем кликабельной + иконка 📝
      const note = month.notes && month.notes[i];
      if (note && note.trim() !== '') {
        cell.classList.add('has-note');
        cell.addEventListener('click', () => {
          notesTitle.textContent = 'Day ' + i;
          notesText.textContent = note;
          notesModal.classList.add('active');
        });
      }

      modalGrid.appendChild(cell);
    }

    modal.classList.add('active');
  }

  document.getElementById('monthViewBack').addEventListener('click', (e) => {
    e.preventDefault();
    modal.classList.remove('active');
  });

  document.getElementById('yearNotesBack').addEventListener('click', (e) => {
    e.preventDefault();
    notesModal.classList.remove('active');
  });
})();


// ===== Фиксация =====
(function () {
  const fixSetup = document.getElementById('fixSetup');
  if (!fixSetup) return;

  const musicSetup = document.getElementById('musicSetup');
  const countdownSetup = document.getElementById('countdownSetup');
  const fixPlayer = document.getElementById('fixPlayer');
  const finishSetup = document.getElementById('finishSetup');

  const fixNextBtn = document.getElementById('fixNextBtn');
  const countdownNumber = document.getElementById('countdownNumber');

  const fixStatus = document.getElementById('fixStatus');
  const fixTimer = document.getElementById('fixTimer');
  const fixMusicName = document.getElementById('fixMusicName');
  const fixProgress = document.getElementById('fixProgress');
  const fixAudio = document.getElementById('fixAudio');
  
  const backBtn = document.querySelector('.cal-back');

  let totalLessons = 3;
  let breakMin = 10;
  let extraBreakMin = 0;
  let extraBreakAfter = 0;
  let currentLesson = 1;
  let isBreak = false;
  let timerInterval = null;
  let timeLeft = 0;
  let audioCtx, analyser, source;

  // Кнопка "Назад"
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      if (fixPlayer.style.display === 'flex') {
        e.preventDefault();
        clearInterval(timerInterval);
        fixAudio.pause();
        fixProgress.style.width = '0%';
        fixPlayer.style.display = 'none';
        musicSetup.style.display = 'flex';
      }
    });
  }

  // Шаг 1 -> Шаг 2
  fixNextBtn.addEventListener('click', () => {
    totalLessons = parseInt(document.getElementById('fixLessons').value) || 3;
    breakMin = parseInt(document.getElementById('fixBreak').value) || 10;
    extraBreakMin = parseInt(document.getElementById('fixExtraBreakTime').value) || 0;
    extraBreakAfter = parseInt(document.getElementById('fixExtraBreakAfter').value) || 0;

    fixSetup.style.display = 'none';
    musicSetup.style.display = 'flex';
  });

  // Шаг 2 -> Шаг 3 (Отсчет)
  document.querySelectorAll('.fix-music-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const music = btn.dataset.music;
      fixMusicName.textContent = btn.textContent;
      fixAudio.src = '../audio/' + music + '.m4a';

      // Разблокировка звука
      fixAudio.volume = 0;
      fixAudio.play().then(() => {
        fixAudio.pause();
        fixAudio.currentTime = 0;
        fixAudio.volume = 1;
      }).catch(err => console.warn("Audio unlock:", err));

      musicSetup.style.display = 'none';
      countdownSetup.style.display = 'flex';

      let count = 10;
      countdownNumber.textContent = count;

      const countInt = setInterval(() => {
        count--;
        if (count > 0) {
          countdownNumber.textContent = count;
        } else {
          clearInterval(countInt);
          countdownSetup.style.display = 'none';
          fixPlayer.style.display = 'flex';
          
          startLesson(); 
          initFixWaves(); // Включаем волны только когда экран уже открыт
        }
      }, 1000);
    });
  });

  function startLesson() {
    fixStatus.textContent = 'Урок ' + currentLesson + '/' + totalLessons;
    isBreak = false;
    timeLeft = 60 * 60;
    
    fixAudio.play().catch(err => console.warn("Audio play error:", err));
    runTimer();
    updateMediaSession();
  }

  function startBreak(isExtra = false) {
    fixStatus.textContent = 'Break';
    isBreak = true;
    timeLeft = (isExtra ? extraBreakMin : breakMin) * 60;
    runTimer();
    updateMediaSession();
  }

  // Фоновый режим (Экран блокировки)
  function updateMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: fixStatus.textContent,
        artist: 'Change Your Life',
        album: fixMusicName.textContent
      });
      navigator.mediaSession.setActionHandler('play', () => fixAudio.play());
      navigator.mediaSession.setActionHandler('pause', () => fixAudio.pause());
    }
  }

  function runTimer() {
    clearInterval(timerInterval);
    updateTimerDisplay();

    timerInterval = setInterval(() => {
      timeLeft--;
      updateTimerDisplay();

      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        if (isBreak) {
          currentLesson++;
          if (currentLesson > totalLessons) {
            finishSetup.style.display = 'flex';
            fixPlayer.style.display = 'none';
            fixAudio.pause();
          } else {
            startLesson();
          }
        } else {
          if (currentLesson === extraBreakAfter && extraBreakMin > 0) {
            startBreak(true);
          } else if (currentLesson < totalLessons) {
            startBreak(false);
          } else {
            finishSetup.style.display = 'flex';
            fixPlayer.style.display = 'none';
            fixAudio.pause();
          }
        }
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    fixTimer.textContent = 
      (m < 10 ? '0' : '') + m + ':' + 
      (s < 10 ? '0' : '') + s;
    
    if (!isBreak) {
      const totalTime = 60 * 60;
      const pct = ((totalTime - timeLeft) / totalTime) * 100;
      fixProgress.style.width = pct + '%';
    } else {
      const total = (currentLesson === extraBreakAfter && extraBreakMin > 0 ? extraBreakMin : breakMin) * 60;
      const pct = ((total - timeLeft) / total) * 100;
      fixProgress.style.width = pct + '%';
    }
  }

  // Волны для фиксации (исправленные для iPhone)
  function initFixWaves() {
    const canvas = document.getElementById('fixCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      source = audioCtx.createMediaElementSource(fixAudio);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    analyser.fftSize = 128;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let offset = 0;

    function draw() {
      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);
      }

      ctx.clearRect(0, 0, w, h);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
      const avg = sum / bufferLength / 255; 

      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0.00, 'rgba(201, 160, 160, 0.8)');
      grad.addColorStop(0.25, 'rgba(242, 215, 133, 0.8)');
      grad.addColorStop(0.50, 'rgba(168, 184, 144, 0.8)');
      grad.addColorStop(0.75, 'rgba(160, 190, 210, 0.8)');
      grad.addColorStop(1.00, 'rgba(200, 170, 210, 0.8)');

      ctx.beginPath();
      ctx.moveTo(0, h);
      const points = 30;
      const step = w / points;
      const amp = 5 + avg * 30; 
      offset += 0.04 + avg * 0.1;

      for (let i = 0; i <= points; i++) {
        const x = i * step;
        const y = h * 0.6 + Math.sin(i * 0.4 + offset) * amp;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i <= points; i++) {
        const x = i * step;
        const y = h * 0.7 + Math.sin(i * 0.6 - offset * 1.2) * amp * 0.7;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    draw();
  }
})();