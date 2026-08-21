/* ==========================================
   Wedding Invitation — Islam & Habiba
   script.js — البتلات، فتح الدعوة، ظهور الأقسام،
   العد التنازلي، التقويم، إضافة للتقويم،
   سجل التهاني (Supabase)، الموسيقى،
   ونظام "إرسال النقطة" (Vodafone Cash + رفع إيصال).
   ========================================== */

document.addEventListener('DOMContentLoaded', function () {

    /* ---------------------------------------------
       0) إعدادات عامة
    --------------------------------------------- */

    // تاريخ ووقت حفل الزفاف: الخميس 3 سبتمبر 2026 الساعة 8:00 مساءً
    var WEDDING_DATE = new Date(2026, 8, 3, 20, 0, 0);

    var PETAL_IMG = 'assets/images/hoa.webp';

    var reduceMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // اكتشاف موثوق لأجهزة iOS (آيفون/آيباد)، بما فيها iPadOS 13+
    // التي تخفي نفسها كـ Mac في الـ userAgent لكنها تدعم اللمس
    function isIOSDevice() {
        var ua = navigator.userAgent || navigator.vendor || '';
        var isAppleTouch = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
        var isIPadOS13Plus = navigator.platform === 'MacIntel' &&
            navigator.maxTouchPoints && navigator.maxTouchPoints > 1;
        return isAppleTouch || !!isIPadOS13Plus;
    }

    var IS_IOS = isIOSDevice();

    /* ---------------------------------------------
       1) البتلات المتساقطة (صورة ورد حقيقية)
    --------------------------------------------- */

    function initPetals() {

        var container = document.getElementById('petals');
        if (!container || reduceMotion) return;

        // على iOS نقلل عدد وسرعة إنشاء البتلات لتفادي إثقال Safari
        var initialCount = IS_IOS ? 3 : 5;
        var spawnIntervalMs = IS_IOS ? 3200 : 1800;

        function spawnPetal() {

            var petal = document.createElement('span');
            petal.className = 'petal';

            var img = document.createElement('img');
            img.src = PETAL_IMG;
            img.alt = '';
            petal.appendChild(img);

            var left = Math.random() * 100;
            var duration = 9 + Math.random() * 6; // 9s - 15s
            var delay = Math.random() * 2;
            var size = 26 + Math.random() * 22;

            petal.style.left = left + 'vw';
            petal.style.width = size + 'px';
            petal.style.animationDuration = duration + 's';
            petal.style.animationDelay = delay + 's';

            container.appendChild(petal);

            window.setTimeout(function () {
                petal.remove();
            }, (duration + delay) * 1000 + 200);
        }

        // بتلات أولية
        for (var i = 0; i < initialCount; i++) {
            window.setTimeout(spawnPetal, i * 600);
        }

        // بتلات مستمرة كل فترة (كل بتلة تُزال من الـ DOM تلقائياً
        // بعد انتهاء الأنيميشن الخاصة بها، فلا يحدث تراكم عناصر)
        window.setInterval(spawnPetal, spawnIntervalMs);
    }

    /* ---------------------------------------------
       2) التمرير التلقائي البطيء بعد فتح الدعوة
       (Auto-scroll: constant speed, cancellable by
       any user interaction, safe against duplicates,
       works on desktop / Android Chrome / iOS Safari)
    --------------------------------------------- */

    let autoScrollActive = false;
    let autoScrollRAF = null;

    // سرعة التمرير بالبكسل لكل إطار (ثابتة، بدون تسارع أو تباطؤ)
    var AUTO_SCROLL_SPEED = 1.2;

    // الأحداث التي تعتبر "تدخل يدوي من المستخدم" فتوقف التمرير التلقائي فوراً
    var USER_INTERRUPT_EVENTS = [
        'wheel',
        'touchstart',
        'pointerdown',
        'mousedown',
        'keydown'
    ];

    function handleUserInterrupt() {
        stopAutoScroll();
    }

    function startAutoScroll() {

        // امنع إنشاء أكثر من loop في نفس الوقت
        if (autoScrollActive) return;
        autoScrollActive = true;

        // أوقف التمرير التلقائي فور أي تفاعل يدوي من المستخدم
        USER_INTERRUPT_EVENTS.forEach(function (evt) {
            window.addEventListener(evt, handleUserInterrupt, { passive: true });
        });

        // scrollingElement هو العنصر الصحيح دائماً (html عادة) الذي
        // يمثل مساحة التمرير الفعلية للصفحة على كل المتصفحات بما فيها
        // Safari على iOS، بعكس الاعتماد على window.scrollBy وحدها
        var scroller = document.scrollingElement || document.documentElement;

        function step() {

            if (!autoScrollActive) return;

            var maxScroll = scroller.scrollHeight - window.innerHeight;
            var current = scroller.scrollTop;

            if (current >= maxScroll - 1) {
                stopAutoScroll();
                return;
            }

            scroller.scrollTop = current + AUTO_SCROLL_SPEED;

            // loop واحد فقط: كل إطار يستدعي نفسه مرة واحدة
            autoScrollRAF = window.requestAnimationFrame(step);
        }

        autoScrollRAF = window.requestAnimationFrame(step);
    }

    function stopAutoScroll() {

        if (!autoScrollActive) return;
        autoScrollActive = false;

        if (autoScrollRAF !== null) {
            window.cancelAnimationFrame(autoScrollRAF);
            autoScrollRAF = null;
        }

        USER_INTERRUPT_EVENTS.forEach(function (evt) {
            window.removeEventListener(evt, handleUserInterrupt);
        });
    }

    /* ---------------------------------------------
       3) شاشة الغلاف — فتح الدعوة
    --------------------------------------------- */

    function initCover() {

        var cover = document.getElementById('cover');
        var openBtn = document.getElementById('openBtn');
        var invite = document.getElementById('invite');
        var music = document.getElementById('music');
        var musicBtn = document.getElementById('musicBtn');

        if (!openBtn || !cover || !invite) return;

        openBtn.addEventListener('click', function () {

            // كونفيتي — نعطّلها على iPhone/iPad فقط لأن canvas-confetti
            // يثقل Safari وقت فتح الدعوة ويساهم في الـ lag/الشاشة البيضاء.
            // تبقى تعمل بشكل طبيعي على Desktop وAndroid.
            if (window.confetti && !reduceMotion && !IS_IOS) {
                window.confetti({
                    particleCount: 120,
                    spread: 90,
                    startVelocity: 45,
                    origin: { y: 0.6 },
                    colors: ['#a9832c', '#e6d9b8', '#7c8a5c', '#9aa878', '#ffffff']
                });
            }

            cover.classList.add('fade-out');

            // تشغيل الموسيقى من نفس الـ click event مباشرة (بدون أي انتظار
            // قبله) حتى يقبلها Safari ضمن سياسة الـ autoplay الخاصة به.
            // play() غير معطِّلة (non-blocking) لباقي الكود، وأي رفض من
            // Safari يُلتقط في catch بدون التأثير على بقية التنفيذ.
            if (music) {
                music.volume = 0.5;
                music.play().then(() => {
                    musicBtn?.classList.add('playing');
                }).catch(() => {
                    // Safari رفض التشغيل التلقائي، لا مشكلة، الزر اليدوي يبقى متاحاً
                });
            }

            setTimeout(() => {

                cover.style.display = "none";
                invite.classList.add("show");

                document.body.style.overflow = "";
                document.documentElement.style.overflow = "";

                // انتظر إطارين (رسم كامل) حتى ينتهي Safari من إعادة
                // حساب الـ layout والارتفاع بعد تغيير display/class،
                // فيتجنب الشاشة البيضاء والـ lag على iPhone
                requestAnimationFrame(() => {

                    requestAnimationFrame(() => {

                        revealVisibleSections();

                        // يبدأ النزول التلقائي بعد فتح الدعوة
                        setTimeout(() => {

                            if (!reduceMotion) {
                                startAutoScroll();
                            }

                        }, 1000);

                    });

                });

            }, 850);
        });

        document.body.style.overflow = "hidden";
    }

    /* ---------------------------------------------
       4) ظهور الأقسام تدريجياً عند التمرير
    --------------------------------------------- */

    var revealTargets = [];

    function revealVisibleSections() {
        revealTargets.forEach(function (el) {
            var rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.9) {
                el.classList.add('in-view');
            }
        });
    }

    function initReveal() {

        revealTargets = Array.prototype.slice.call(
            document.querySelectorAll('.section, .thanks')
        );

        if (!revealTargets.length) return;

        if ('IntersectionObserver' in window) {

            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('in-view');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.15 });

            revealTargets.forEach(function (el) {
                observer.observe(el);
            });

        } else {
            window.addEventListener('scroll', revealVisibleSections);
            revealVisibleSections();
        }
    }

    /* ---------------------------------------------
       5) العد التنازلي
    --------------------------------------------- */

    function initCountdown() {

        var elDays = document.getElementById('cd-days');
        var elHours = document.getElementById('cd-hours');
        var elMins = document.getElementById('cd-mins');
        var elSecs = document.getElementById('cd-secs');

        if (!elDays || !elHours || !elMins || !elSecs) return;

        function pad(n) {
            return String(n).padStart(2, '0');
        }

        function tick() {

            var now = new Date();
            var diff = WEDDING_DATE.getTime() - now.getTime();

            if (diff <= 0) {
                elDays.textContent = '00';
                elHours.textContent = '00';
                elMins.textContent = '00';
                elSecs.textContent = '00';
                window.clearInterval(timer);
                return;
            }

            var days = Math.floor(diff / (1000 * 60 * 60 * 24));
            var hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            var mins = Math.floor((diff / (1000 * 60)) % 60);
            var secs = Math.floor((diff / 1000) % 60);

            elDays.textContent = pad(days);
            elHours.textContent = pad(hours);
            elMins.textContent = pad(mins);
            elSecs.textContent = pad(secs);
        }

        tick();
        var timer = window.setInterval(tick, 1000);
    }

    /* ---------------------------------------------
       6) تقويم سبتمبر 2026 مع تظليل يوم الفرح
    --------------------------------------------- */

    function initCalendar() {

        var titleEl = document.getElementById('calendarTitle');
        var gridEl = document.getElementById('calendarGrid');

        if (!titleEl || !gridEl) return;

        var year = WEDDING_DATE.getFullYear();
        var month = WEDDING_DATE.getMonth();
        var weddingDay = WEDDING_DATE.getDate();

        var monthNames = [
            'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];

        titleEl.textContent = monthNames[month] + ' ' + year;

        var dowLabels = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

        var firstDay = new Date(year, month, 1);
        var startOffset = firstDay.getDay();
        var daysInMonth = new Date(year, month + 1, 0).getDate();

        var html = '';

        dowLabels.forEach(function (label) {
            html += '<div class="dow">' + label + '</div>';
        });

        for (var i = 0; i < startOffset; i++) {
            html += '<div class="day empty"></div>';
        }

        for (var d = 1; d <= daysInMonth; d++) {
            var highlight = (d === weddingDay) ? ' highlight' : '';
            html += '<div class="day' + highlight + '">' + d + '</div>';
        }

        gridEl.innerHTML = html;
    }

    /* ---------------------------------------------
       7) زر "أضِف إلى التقويم"
    --------------------------------------------- */

    function toGCalDate(date) {
        var iso = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        return iso;
    }

    function initAddToCalendar() {

        var btn = document.getElementById('addCalendarBtn');
        if (!btn) return;

        var start = WEDDING_DATE;
        var end = new Date(WEDDING_DATE.getTime() + 3 * 60 * 60 * 1000);

        var title = encodeURIComponent('حفل زفاف Islam & Habiba');
        var details = encodeURIComponent('يسعدنا حضوركم حفل زفاف Islam & Habiba في نادي دار المهندسين - قاعة سونستا.');
        var location = encodeURIComponent('نادي دار المهندسين – قاعة سونستا');

        var gcalUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
            + '&text=' + title
            + '&dates=' + toGCalDate(start) + '/' + toGCalDate(end)
            + '&details=' + details
            + '&location=' + location;

        btn.setAttribute('href', gcalUrl);
        btn.setAttribute('target', '_blank');
        btn.setAttribute('rel', 'noopener');

        btn.addEventListener('click', function () {
            showToast('جاري فتح تقويم جوجل 📅');
        });
    }

    /* ---------------------------------------------
       8) سجل التهاني — متصل بـ Supabase (مشترك لكل الزوار)
       fallback على localStorage لو الاتصال فشل
    --------------------------------------------- */

    var LOCAL_WISHES_KEY = 'wedding_wishes_islam_habiba';
    var supabaseClient = null;

    function getSupabaseClient() {

        if (supabaseClient) return supabaseClient;

        if (typeof window.supabase === 'undefined' ||
            !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
            return null;
        }

        try {
            supabaseClient = window.supabase.createClient(
                window.SUPABASE_URL,
                window.SUPABASE_ANON_KEY
            );
            return supabaseClient;
        } catch (e) {
            return null;
        }
    }

    // ---- Fallback محلي (لو مفيش اتصال بالإنترنت أو Supabase مش شغال) ----

    function getLocalWishes() {
        try {
            var raw = window.localStorage.getItem(LOCAL_WISHES_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveLocalWish(wish) {
        try {
            var list = getLocalWishes();
            list.push(wish);
            window.localStorage.setItem(LOCAL_WISHES_KEY, JSON.stringify(list));
        } catch (e) {
            // تجاهل
        }
    }

    // ---- عرض التهاني في الصفحة ----

    function renderWishesList(wishes) {

        var listEl = document.getElementById('wishesList');
        var noWishesEl = document.getElementById('noWishes');
        if (!listEl) return;

        Array.prototype.slice.call(listEl.querySelectorAll('.wish-card')).forEach(function (card) {
            card.remove();
        });

        if (!wishes.length) {
            if (noWishesEl) {
                noWishesEl.textContent = 'No wishes yet. Be the first!';
                noWishesEl.style.display = '';
            }
            return;
        }

        if (noWishesEl) noWishesEl.style.display = 'none';

        wishes.forEach(function (wish) {

            var card = document.createElement('div');
            card.className = 'wish-card';

            var nameEl = document.createElement('p');
            nameEl.className = 'wish-name';
            nameEl.textContent = wish.name;

            var msgEl = document.createElement('p');
            msgEl.className = 'wish-message';
            msgEl.textContent = wish.message;

            card.appendChild(nameEl);
            card.appendChild(msgEl);
            listEl.appendChild(card);
        });
    }

    // ---- تحميل التهاني (من Supabase أو من التخزين المحلي) ----

    function loadWishes() {

        var client = getSupabaseClient();

        if (!client) {
            renderWishesList(getLocalWishes().slice().reverse());
            return;
        }

        client
            .from('wishes')
            .select('name, message, created_at')
            .order('created_at', { ascending: false })
            .then(function (res) {

                if (res.error) {
                    // فشل الاتصال بقاعدة البيانات، ارجع للنسخة المحلية
                    renderWishesList(getLocalWishes().slice().reverse());
                    return;
                }

                renderWishesList(res.data || []);
            })
            .catch(function () {
                renderWishesList(getLocalWishes().slice().reverse());
            });
    }

    // ---- إرسال تهنئة جديدة ----

    function submitWish(name, message) {

        var client = getSupabaseClient();

        if (!client) {
            saveLocalWish({ name: name, message: message });
            loadWishes();
            showToast('تم إرسال تهنئتك، شكراً لك 💗');
            return;
        }

        client
            .from('wishes')
            .insert([{ name: name, message: message }])
            .then(function (res) {

                if (res.error) {
                    // فشل الإرسال لأونلاين، احفظها محلياً كحل بديل
                    saveLocalWish({ name: name, message: message });
                    showToast('تعذّر الإرسال أونلاين، اتحفظت التهنئة عندك فقط');
                } else {
                    showToast('تم إرسال تهنئتك، شكراً لك 💗');
                }

                loadWishes();
            })
            .catch(function () {
                saveLocalWish({ name: name, message: message });
                loadWishes();
                showToast('تعذّر الإرسال أونلاين، اتحفظت التهنئة عندك فقط');
            });
    }

    // ---- تحديث لحظي (Realtime) لو مفعّل من لوحة تحكم Supabase ----

    function initRealtimeWishes() {

        var client = getSupabaseClient();
        if (!client || typeof client.channel !== 'function') return;

        try {
            client
                .channel('wishes-changes')
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'wishes' },
                    function () {
                        loadWishes();
                    }
                )
                .subscribe();
        } catch (e) {
            // Realtime مش مفعّل، مفيش مشكلة، الصفحة بتشتغل عادي بدونه
        }
    }

    function initGuestbook() {

        var wishBtn = document.getElementById('wishBtn');
        var wishForm = document.getElementById('wishForm');
        var wishCancel = document.getElementById('wishCancel');
        var nameInput = document.getElementById('wishName');
        var messageInput = document.getElementById('wishMessage');

        if (!wishBtn || !wishForm) return;

        wishBtn.addEventListener('click', function () {
            wishForm.hidden = !wishForm.hidden;
            if (!wishForm.hidden && nameInput) {
                nameInput.focus();
            }
        });

        if (wishCancel) {
            wishCancel.addEventListener('click', function () {
                wishForm.reset();
                wishForm.hidden = true;
            });
        }

        wishForm.addEventListener('submit', function (e) {

            e.preventDefault();

            var name = (nameInput && nameInput.value || '').trim();
            var message = (messageInput && messageInput.value || '').trim();

            if (!name || !message) return;

            submitWish(name, message);

            wishForm.reset();
            wishForm.hidden = true;
        });

        loadWishes();
        initRealtimeWishes();
    }

    /* ---------------------------------------------
       9) زر الموسيقى
    --------------------------------------------- */

    function initMusic() {

        var music = document.getElementById('music');
        var btn = document.getElementById('musicBtn');

        if (!music || !btn) return;

        btn.addEventListener('click', function () {

            if (music.paused) {
                music.play().then(function () {
                    btn.classList.add('playing');
                    btn.textContent = '🔊';
                }).catch(function () {
                    showToast('تعذّر تشغيل الموسيقى');
                });
            } else {
                music.pause();
                btn.classList.remove('playing');
                btn.textContent = '🎵';
            }
        });
    }

    /* ---------------------------------------------
       10) التنبيهات (Toast)
    --------------------------------------------- */

    var toastTimer = null;

    function showToast(message) {

        var toast = document.getElementById('toast');
        if (!toast) return;

        toast.textContent = message;
        toast.classList.add('show');

        if (toastTimer) window.clearTimeout(toastTimer);

        toastTimer = window.setTimeout(function () {
            toast.classList.remove('show');
        }, 2800);
    }

    /* ---------------------------------------------
       11) "إرسال النقطة" — Vodafone Cash + رفع الإيصال
       ---------------------------------------------
       - Bucket خاص (Private) في Supabase Storage: wedding-receipts
       - جدول public.wedding_receipts لتسجيل بيانات كل تحويل
       - بعد النجاح: يفتح واتساب برسالة جاهزة لرقم العريس
         (wa.me — بدون أي WhatsApp API مدفوع، والمستخدم هو من
         يضغط "إرسال" داخل واتساب فعلياً)
    --------------------------------------------- */

    var RECEIPTS_BUCKET = 'wedding-receipts';
    var MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    var ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    // رقم واتساب العريس لاستقبال إشعار الإيصال (مبني على رقم
    // الـ Vodafone Cash المُعطى، بصيغة دولية بدون علامة +)
    var GROOM_WHATSAPP_NUMBER = '201070052236';

    var giftSubmitting = false;

    function initGiftFlow() {

        var giftBtn = document.getElementById('giftBtn');
        var modal = document.getElementById('giftModal');
        var closeBtn = document.getElementById('giftModalClose');

        var stepPay = document.getElementById('giftStepPay');
        var stepUpload = document.getElementById('giftStepUpload');
        var stepSuccess = document.getElementById('giftStepSuccess');

        var nextBtn = document.getElementById('giftNextBtn');
        var copyBtn = document.getElementById('copyNumberBtn');
        var payNumberEl = document.getElementById('payNumber');

        var form = document.getElementById('receiptForm');
        var nameInput = document.getElementById('receiptName');
        var phoneInput = document.getElementById('receiptPhone');
        var fileInput = document.getElementById('receiptFile');
        var fileLabel = document.getElementById('fileLabel');
        var fileNameEl = document.getElementById('fileName');
        var errorEl = document.getElementById('receiptError');
        var submitBtn = document.getElementById('receiptSubmitBtn');

        var whatsappBtn = document.getElementById('giftWhatsappBtn');
        var doneBtn = document.getElementById('giftDoneBtn');

        if (!giftBtn || !modal) return;

        function showStep(step) {
            [stepPay, stepUpload, stepSuccess].forEach(function (s) {
                if (s) s.hidden = (s !== step);
            });
        }

        function openModal() {
            modal.hidden = false;
            document.body.style.overflow = 'hidden';
            showStep(stepPay);
        }

        function closeModal() {
            modal.hidden = true;
            document.body.style.overflow = '';
        }

        function resetForm() {
            if (form) form.reset();
            if (fileNameEl) fileNameEl.textContent = '';
            if (fileLabel) fileLabel.classList.remove('has-file');
            hideError();
        }

        function showError(msg) {
            if (!errorEl) return;
            errorEl.textContent = msg;
            errorEl.hidden = false;
        }

        function hideError() {
            if (!errorEl) return;
            errorEl.hidden = true;
            errorEl.textContent = '';
        }

        giftBtn.addEventListener('click', openModal);

        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeModal();
        });

        if (nextBtn) {
            nextBtn.addEventListener('click', function () {
                showStep(stepUpload);
                if (nameInput) nameInput.focus();
            });
        }

        // نسخ رقم Vodafone Cash
        if (copyBtn && payNumberEl) {
            copyBtn.addEventListener('click', function () {

                var number = payNumberEl.textContent.trim();

                function markCopied() {
                    copyBtn.textContent = 'تم النسخ ✓';
                    copyBtn.classList.add('copied');
                    window.setTimeout(function () {
                        copyBtn.textContent = 'نسخ';
                        copyBtn.classList.remove('copied');
                    }, 1800);
                }

                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(number).then(markCopied).catch(function () {
                        showToast('تعذّر نسخ الرقم، انسخه يدوياً');
                    });
                } else {
                    // Fallback لمتصفحات قديمة لا تدعم Clipboard API
                    var tmp = document.createElement('input');
                    tmp.value = number;
                    document.body.appendChild(tmp);
                    tmp.select();
                    try {
                        document.execCommand('copy');
                        markCopied();
                    } catch (e) {
                        showToast('تعذّر نسخ الرقم، انسخه يدوياً');
                    }
                    tmp.remove();
                }
            });
        }

        // عرض اسم الملف المختار + تحقق مبدئي فوري
        if (fileInput) {
            fileInput.addEventListener('change', function () {

                hideError();

                var file = fileInput.files && fileInput.files[0];

                if (!file) {
                    if (fileNameEl) fileNameEl.textContent = '';
                    if (fileLabel) fileLabel.classList.remove('has-file');
                    return;
                }

                if (ALLOWED_TYPES.indexOf(file.type) === -1) {
                    showError('من فضلك اختر صورة بصيغة JPG أو PNG أو WEBP فقط.');
                    fileInput.value = '';
                    if (fileNameEl) fileNameEl.textContent = '';
                    if (fileLabel) fileLabel.classList.remove('has-file');
                    return;
                }

                if (file.size > MAX_FILE_SIZE) {
                    showError('حجم الصورة أكبر من 5 ميجابايت، من فضلك اختر صورة أصغر.');
                    fileInput.value = '';
                    if (fileNameEl) fileNameEl.textContent = '';
                    if (fileLabel) fileLabel.classList.remove('has-file');
                    return;
                }

                if (fileNameEl) fileNameEl.textContent = '📎 ' + file.name;
                if (fileLabel) fileLabel.classList.add('has-file');
            });
        }

        function buildWhatsAppUrl(name, phone) {

            var lines = [
                '🔔 تم استلام نقطة جديدة',
                '',
                '👤 الاسم: ' + name,
                '📱 الهاتف: ' + (phone || '—'),
                '',
                '💰 Vodafone Cash',
                '🧾 تم رفع الإيصال بنجاح'
            ];

            var text = encodeURIComponent(lines.join('\n'));
            return 'https://wa.me/' + GROOM_WHATSAPP_NUMBER + '?text=' + text;
        }

        if (form) {

            form.addEventListener('submit', function (e) {

                e.preventDefault();

                // منع الضغط المتكرر على زر الإرسال
                if (giftSubmitting) return;

                hideError();

                var name = (nameInput && nameInput.value || '').trim();
                var phone = (phoneInput && phoneInput.value || '').trim();
                var file = fileInput && fileInput.files && fileInput.files[0];

                if (!name) {
                    showError('من فضلك اكتب اسمك.');
                    return;
                }

                if (!file) {
                    showError('من فضلك ارفع صورة إيصال التحويل.');
                    return;
                }

                if (ALLOWED_TYPES.indexOf(file.type) === -1) {
                    showError('صيغة الصورة غير مدعومة، استخدم JPG أو PNG أو WEBP.');
                    return;
                }

                if (file.size > MAX_FILE_SIZE) {
                    showError('حجم الصورة أكبر من 5 ميجابايت.');
                    return;
                }

                var client = getSupabaseClient();

                if (!client) {
                    showError('تعذّر الاتصال بالخادم الآن، حاول مرة أخرى بعد قليل.');
                    return;
                }

                giftSubmitting = true;
                submitBtn.disabled = true;
                submitBtn.setAttribute('aria-disabled', 'true');
                var originalLabel = submitBtn.textContent;
                submitBtn.textContent = 'جارِ الرفع...';

                var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
                var safeExt = /^[a-z0-9]+$/.test(ext) ? ext : 'jpg';
                var filePath = 'receipts/' + Date.now() + '_' + Math.random().toString(36).slice(2, 9) + '.' + safeExt;

                client.storage
                    .from(RECEIPTS_BUCKET)
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: false,
                        contentType: file.type
                    })
                    .then(function (uploadRes) {

                        if (uploadRes.error) {
                            throw uploadRes.error;
                        }

                        return client
                            .from('wedding_receipts')
                            .insert([{
                                name: name,
                                phone: phone || null,
                                file_path: filePath
                            }]);
                    })
                    .then(function (insertRes) {

                        if (insertRes.error) {
                            throw insertRes.error;
                        }

                        // نجاح: اعرض رسالة النجاح وجهّز رابط واتساب
                        if (whatsappBtn) {
                            whatsappBtn.setAttribute('href', buildWhatsAppUrl(name, phone));
                        }

                        showStep(stepSuccess);
                        resetForm();

                        // محاولة فتح واتساب تلقائياً؛ لو منعه المتصفح (خصوصاً
                        // Safari على iOS) يبقى زر "فتح واتساب" في شاشة النجاح
                        // متاحاً كبديل يدوي مضمون
                        if (whatsappBtn) {
                            window.open(whatsappBtn.getAttribute('href'), '_blank', 'noopener');
                        }
                    })
                    .catch(function (err) {
                        showError('حصل خطأ أثناء إرسال الإيصال، من فضلك حاول مرة أخرى. (' +
                            ((err && err.message) || 'خطأ غير معروف') + ')');
                    })
                    .finally(function () {
                        giftSubmitting = false;
                        submitBtn.disabled = false;
                        submitBtn.removeAttribute('aria-disabled');
                        submitBtn.textContent = originalLabel;
                    });
            });
        }

        if (doneBtn) {
            doneBtn.addEventListener('click', closeModal);
        }
    }

    /* ---------------------------------------------
       التشغيل
    --------------------------------------------- */

    initPetals();
    initCover();
    initReveal();
    initCountdown();
    initCalendar();
    initAddToCalendar();
    initGuestbook();
    initMusic();
    initGiftFlow();

});