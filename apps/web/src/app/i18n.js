/* JANITOU FOOD — lightweight AR/FR translator for the Arabic mobile apps.
 * Translations are applied to rendered text and to placeholder/title attributes.
 * Switching language reloads the page; templates always render Arabic.
 */
(function (global) {
  'use strict';

  var LANG = localStorage.getItem('janitou_lang') === 'fr' ? 'fr' : 'ar';

  var DICTIONARY = {
    'جانيتو فود': 'JANITOU FOOD',
    'اطلب وجبتك اليومية بسهولة': 'Commandez votre repas du jour',
    'دخول': 'Connexion',
    'دخول الإدارة': 'Administration',
    'تسجيل جديد': 'Créer un compte',
    'البريد الإلكتروني': 'E-mail',
    'كلمة المرور': 'Mot de passe',
    'رقم الهاتف': 'Téléphone',
    'رمز الدخول (4 أرقام)': 'Code (4 chiffres)',
    'نسخة تجريبية: 0555 44 33 22 — الرمز 1234': 'Démo : 0555 44 33 22 — code 1234',
    'تجريبي: admin@janitou.dz / Admin@2026': 'Démo : admin@janitou.dz / Admin@2026',
    'الاسم الكامل': 'Nom complet',
    'عنوان التوصيل': 'Adresse de livraison',
    'الولاية': 'Wilaya',
    'البلدية': 'Commune',
    'إرسال طلب التسجيل': 'Envoyer la demande',
    'يُفعّل الحساب بعد موافقة الإدارة.': 'Le compte est activé après validation.',

    'الرئيسية': 'Accueil',
    'القائمة': 'Menu',
    'قائمة الطعام': 'Menu',
    'برنامجي': 'Programme',
    'برنامجي الأسبوعي': 'Mon programme hebdomadaire',
    'طلباتي': 'Mes commandes',
    'حسابي': 'Mon compte',
    'الطلبات': 'Commandes',
    'طلبات اليوم': 'Commandes du jour',
    'الأطباق': 'Plats',
    'العملاء': 'Clients',
    'الإعدادات': 'Réglages',
    'الوجبات': 'Plats',
    'التسعيرة': 'Tarifs',
    'التغليف': 'Emballage',
    'الإضافات': 'Extras',
    'التوقيت': 'Horaires',
    'وضع بسيط': 'Mode simple',
    'تطبيق العملاء': 'Application client',
    'تسجيل الخروج': 'Déconnexion',

    'الغداء': 'Déjeuner',
    'العشاء': 'Dîner',
    'قائمة اليوم': 'Menu du jour',
    'عرض الكل': 'Tout voir',
    'طلبات': 'commandes',
    'أصناف': 'plats',
    'وجبات': 'repas',
    'إحصائيات اليوم': 'Statistiques du jour',
    'لا توجد طلبات اليوم': 'Aucune commande aujourd’hui',
    'لا توجد طلبات لليوم': 'Aucune commande pour aujourd’hui',
    'لا توجد طلبات بعد': 'Aucune commande',
    'أضف طبقاً': 'Ajouter un plat',
    'لم يتم تحديد طبق': 'Aucun plat sélectionné',
    'تغيير الطبق': 'Changer le plat',
    'آخر موعد': 'Date limite',
    'الطلب مفتوح': 'Commande ouverte',
    'انتهت فترة الطلب': 'Commande fermée',
    'اطلب هذا اليوم': 'Commander ce jour',
    'لا توجد قائمة منشورة حالياً': 'Aucun menu publié',
    'لا توجد قوائم': 'Aucun menu',
    'لا توجد قوائم مؤرشفة': 'Aucun menu archivé',
    'إضافة قائمة جديدة': 'Ajouter un menu',
    'إضافة طبق جديد': 'Ajouter un plat',
    'الأرشيف': 'Archives',
    'الجارية': 'En cours',
    'طبق جديد': 'Nouveau plat',
    'كل الأطباق المتاحة': 'Tous les plats disponibles',

    'للوجبة': 'par repas',
    'تغليف فردي': 'Emballage individuel',
    'تغليف جماعي': 'Emballage collectif',
    'فردي': 'Individuel',
    'جماعي': 'Collectif',
    'البدائل': 'Alternatives',
    'ملاحظات': 'Notes',
    'ملاحظات خاصة بالطلب': 'Notes pour la commande',
    'المجموع': 'Total',
    'تأكيد الطلب': 'Confirmer la commande',
    'حفظ التعديل': 'Enregistrer les modifications',
    'اختر وجبة غداء أو عشاء': 'Choisissez un déjeuner ou un dîner',
    'لا يوجد طبق': 'Aucun plat',
    'لا توجد بدائل': 'Aucune alternative',
    'لا توجد إضافات': 'Aucun extra',
    'اختر صورة': 'Choisir une photo',
    'صورة الطبق': 'Photo du plat',
    'اسم الطبق': 'Nom du plat',
    'التصنيف': 'Catégorie',
    'طبق رئيسي': 'Plat principal',
    'مقبلات': 'Entrée',
    'تحلية': 'Dessert',
    'العائلة التشغيلية': 'Famille opérationnelle',
    'المكوّن الرئيسي': 'Ingrédient principal',
    'خصائص تشغيلية': 'Caractéristiques opérationnelles',
    'بطاطا مقلية': 'Frites',
    'لحم مفروم': 'Viande hachée',
    'معجنات': 'Pâtes',
    'إضافة الطبق': 'Ajouter le plat',
    'التاريخ': 'Date',
    'طبق الغداء': 'Plat du déjeuner',
    'طبق العشاء': 'Plat du dîner',
    'اختر طبقاً': 'Choisir un plat',
    'إضافة القائمة': 'Ajouter le menu',

    'مفعّل': 'Actif',
    'غير مفعّل': 'Inactif',
    'حفظ البرنامج وتوليد الطلبات': 'Enregistrer et générer les commandes',
    'حدّد كميات الغداء والعشاء لكل يوم. بعد الحفظ تُنشأ الطلبات تلقائياً لليوم والستة أيام القادمة.': 'Définissez les quantités du déjeuner et du dîner pour chaque jour. Après enregistrement, les commandes sont générées pour aujourd’hui et les six prochains jours.',
    'توليد طلبات البرنامج الأسبوعي (7 أيام)': 'Générer les commandes du programme (7 jours)',

    'مؤكدة': 'Confirmée',
    'مبرمجة': 'Planifiée',
    'قيد التحضير': 'En préparation',
    'معبأة': 'Emballée',
    'في التوصيل': 'En livraison',
    'تم التسليم': 'Livrée',
    'ملغاة': 'Annulée',
    'مسودة': 'Brouillon',
    'مدفوعة': 'Payée',
    'غير مدفوعة': 'Non payée',
    'تعديل الطلب': 'Modifier',
    'إلغاء': 'Annuler',
    'إلغاء هذا الطلب؟': 'Annuler cette commande ?',
    'تفاصيل الطلب': 'Détails de la commande',
    'تحديث حالة الطلب': 'Mettre à jour le statut',

    'الحالة': 'Statut',
    'نشط': 'Actif',
    'موقوف': 'Suspendu',
    'مجمد': 'Gelé',
    'ملغى': 'Annulé',
    'بانتظار الاعتماد': 'En attente d’approbation',
    'مراجعة مطلوبة': 'Revue requise',
    'الرصيد المتاح': 'Solde disponible',
    'الرصيد': 'Solde',
    'التوزيع': 'Distribution',
    'طلباتي': 'Mes commandes',
    'الإشعارات': 'Notifications',
    'لا توجد إشعارات': 'Aucune notification',
    'تم حفظ الطلب دون اتصال': 'Commande conservée hors ligne',
    'يوجد طلب في انتظار الإرسال (دون اتصال). سيُرسل تلقائياً عند عودة الشبكة.': 'Une commande est en attente d’envoi (hors ligne). Elle sera transmise au retour du réseau.',
    'تم إرسال الطلب المؤجل': 'Commande hors ligne envoyée',
    'تم تسجيل الطلب بنجاح': 'Commande enregistrée',
    'تم حفظ التعديل': 'Modification enregistrée',
    'تم إلغاء الطلب': 'Commande annulée',
    'تم تحديث حالة الحساب': 'Statut du compte mis à jour',
    'تم تحديث بيانات العميل': 'Fiche client mise à jour',
    'تمت مراجعة الحساب': 'Compte marqué comme revu',
    'تمت تعبئة الرصيد': 'Solde crédité',
    'انتهت الجلسة، أعد الدخول.': 'Session expirée, reconnectez-vous.',
    'تعذر تنفيذ العملية': 'Opération impossible',
    'تعذر الدخول': 'Connexion impossible',
    'تعذر التسجيل': 'Inscription impossible',
    'تم إرسال طلب التسجيل، بانتظار الاعتماد': 'Demande envoyée, en attente de validation',
    'مرحباً': 'Bienvenue',
    'الجلسة غير صالحة.': 'Session invalide.',
    'لا توجد قائمة طعام لهذا اليوم.': 'Aucun menu pour ce jour.',
    'انتهت فترة استقبال الطلبات لهذا اليوم.': 'La période de commande est terminée.',
    'حسابك غير مفعّل، بانتظار موافقة الإدارة.': 'Compte non activé, en attente de validation.',
    'يجب مراجعة الحساب من الإدارة قبل استئناف الطلبات.': 'Votre compte doit être revu par l’administration avant de reprendre les commandes.',
    'الرصيد غير كافٍ لتعديل الطلب. يرجى تعبئة الرصيد.': 'Solde insuffisant pour modifier la commande.',
    'الكمية غير صحيحة.': 'Quantité invalide.',
    'اختر وجبة غداء أو عشاء على الأقل.': 'Choisissez au moins un déjeuner ou un dîner.',
    'لا يوجد طبق غداء لهذا اليوم.': 'Aucun plat de déjeuner ce jour.',
    'لا يوجد طبق عشاء لهذا اليوم.': 'Aucun plat de dîner ce jour.',
    'اختر نوع التغليف لكل وجبة.': 'Choisissez l’emballage pour chaque repas.',
    'أحد البدائل غير متوفر.': 'Une alternative est indisponible.',
    'إضافة غير متوفرة.': 'Extra indisponible.',
    'كمية الإضافة تتجاوز المقترح.': 'La quantité d’extra dépasse le suggéré.',
    'حسابك قيد المراجعة. ستتمكن من الطلب بعد اعتماد الإدارة.': 'Votre compte est en cours de validation. Vous pourrez commander après approbation.',
    'الحساب موقوف مؤقتاً. تواصل مع الإدارة.': 'Compte temporairement suspendu. Contactez l’administration.',
    'الحساب مجمد. تواصل مع الإدارة.': 'Compte gelé. Contactez l’administration.',
    'الحساب ملغى.': 'Compte annulé.',

    'حسابات العملاء': 'Comptes clients',
    'لا يوجد عملاء بعد': 'Aucun client',
    'ملف العميل': 'Fiche client',
    'تعديل البيانات': 'Modifier la fiche',
    'تعديل بيانات العميل': 'Modifier la fiche client',
    'تعبئة الرصيد': 'Créditer le solde',
    'تمت المراجعة': 'Marquer comme revu',
    'اعتماد الحساب': 'Approuver le compte',
    'إيقاف مؤقت': 'Suspendre',
    'إلغاء الحساب': 'Annuler le compte',
    'اسم المسؤول': 'Nom du contact',
    'الهاتف': 'Téléphone',
    'العنوان': 'Adresse',
    'طريقة التوزيع': 'Mode de distribution',
    'الدورة / السائق': 'Tournée / livreur',
    'حفظ': 'Enregistrer',
    'آخر طلب': 'Dernière commande',
    'رصيد': 'Solde',
    'ملف العميل': 'Fiche client',
    'تحديث إلى': 'Passer à',
    'إلغاء الطلب': 'Annuler la commande',
    'ملاحظة': 'Note',

    'التسعيرة': 'Tarifs',
    'التغليف والتوصيل': 'Emballage et livraison',
    'سعر وجبة الغداء (دج)': 'Prix du déjeuner (DA)',
    'سعر وجبة العشاء (دج)': 'Prix du dîner (DA)',
    'سعر التغليف للوجبة (دج)': 'Prix de l’emballage (DA)',
    'سعر التوصيل (دج)': 'Frais de livraison (DA)',
    'آخر موعد لتلقي الطلبات': 'Heure limite des commandes',
    'الإغلاق قبل تاريخ التسليم (أيام)': 'Clôture avant livraison (jours)',
    'أيام التوقف (YYYY-MM-DD مفصولة بفاصلة)': 'Jours fermés (AAAA-MM-JJ séparés par une virgule)',
    'وقت الغداء': 'Horaire du déjeuner',
    'وقت العشاء': 'Horaire du dîner',
    'الإضافة': 'Extra',
    'السعر': 'Prix',
    'لكل وجبات': 'Pour N repas',
    '+ إضافة': '+ Ajouter',
    'حفظ الإعدادات': 'Enregistrer les réglages',
    'تُحتسب الإضافات حسب عدد الوجبات وتظهر للعميل عند الطلب.': 'Les extras sont calculés selon le nombre de repas et affichés au client.',
    'تنبيهات الرزنامة': 'Alertes menu',
    'كل قواعد الرزنامة محترمة لهذا الأسبوع.': 'Toutes les règles du menu sont respectées cette semaine.',
    'البطاطا المقلية في الغداء والعشاء': 'Frites au déjeuner et au dîner',
    'اللحم المفروم في الغداء والعشاء': 'Viande hachée au déjeuner et au dîner',
    'المعجنات أكثر من مرة في الغداء أسبوعياً': 'Pâtes plus d’une fois au déjeuner',
    'وجبة السبت تتجاوز 45 دقيقة تحضير': 'Plat du samedi > 45 min de préparation',
    'نفس المكوّن الرئيسي في الغداء والعشاء': 'Même ingrédient principal au déjeuner et au dîner',
    'تمديد موعد الطلب': 'Prolonger la date limite',
    'آخر موعد جديد للطلب': 'Nouvelle date limite',
    'تمديد الموعد': 'Prolonger',
    'إزالة التمديد': 'Retirer la prolongation',
    'تم تمديد الموعد': 'Date limite prolongée',
    'تمت إزالة التمديد': 'Prolongation retirée',
    'تاريخ غير صحيح': 'Date invalide',
    'أرشفة قائمة هذا اليوم؟': 'Archiver le menu de ce jour ?',
    'استعادة قائمة هذا اليوم؟': 'Restaurer le menu de ce jour ?',
    'تمت الأرشفة': 'Menu archivé',
    'تمت الاستعادة': 'Menu restauré',
    'توليد طلبات البرنامج الأسبوعي': 'Générer les commandes du programme',
    'تم تحديث حالة الحساب': 'Statut du compte mis à jour',
    'لا توجد طلبات': 'Aucune commande',
    'لا توجد قوائم': 'Aucun menu',

    'طلب': 'Commande',
    'تعديل طلب': 'Modifier la commande',
    'غداء': 'Déjeuner',
    'عشاء': 'Dîner',
    'وجبة': 'repas',
    'حلويات': 'Desserts',
    'عصير': 'Jus',
    'المدير العام': 'Directeur général',
    'مسؤول العمليات': 'Responsable opérations',
    'رئيس الورشة': 'Chef d’atelier',
    'المقترح:': 'Suggéré :',
    'مثال: كسكس بالدجاج': 'Ex. : couscous au poulet',
    'POULET / AGNEAU / LEGUMES': 'POULET / AGNEAU / LÉGUMES',
    '2026-11-20, 2026-12-01': '2026-11-20, 2026-12-01',
  };

  var PATTERNS = [
    [/^تعديل طلب /, 'Modifier la commande '],
    [/^طلب /, 'Commande '],
    [/^إضافة قائمة جديدة$/, 'Ajouter un menu'],
    [/تنبيهات الرزنامة \((\d+)\)/, 'Alertes menu ($1)'],
    [/^تم توليد (\d+) طلب$/, '$1 commande(s) générée(s)'],
    [/^تم حفظ البرنامج — (\d+) طلب جديد$/, 'Programme enregistré — $1 nouvelle(s) commande(s)'],
    [/(\d+) وجبة/g, '$1 repas'],
    [/غداء · /g, 'Déjeuner · '],
    [/عشاء · /g, 'Dîner · '],
    [/^(\d+) طلبات$/, '$1 commandes'],
    [/^(\d+) أصناف$/, '$1 plats'],
    [/· برنامج أسبوعي/, '· Programme hebdomadaire'],
    [/المقترح: (\d+)/, 'Suggéré : $1'],
    [/آخر موعد: /, 'Date limite : '],
    [/^الحالة: /, 'Statut : '],
    [/^مرحباً /, 'Bienvenue '],
    [/^آخر موعد جديد للطلب$/, 'Nouvelle date limite'],
    [/نفس المكوّن الرئيسي في الغداء والعشاء/g, 'Même ingrédient principal au déjeuner et au dîner'],
    [/البطاطا المقلية في الغداء والعشاء/g, 'Frites au déjeuner et au dîner'],
    [/اللحم المفروم في الغداء والعشاء/g, 'Viande hachée au déjeuner et au dîner'],
    [/المعجنات أكثر من مرة في الغداء أسبوعياً/g, 'Pâtes plus d’une fois au déjeuner par semaine'],
    [/وجبة السبت تتجاوز 45 دقيقة تحضير/g, 'Plat du samedi dépassant 45 min de préparation'],
  ];

  function translateText(value) {
    if (LANG !== 'fr' || !value) return value;
    var trimmed = value.trim();
    if (!trimmed) return value;
    if (Object.prototype.hasOwnProperty.call(DICTIONARY, trimmed)) {
      return value.replace(trimmed, DICTIONARY[trimmed]);
    }
    var output = value;
    for (var index = 0; index < PATTERNS.length; index += 1) {
      output = output.replace(PATTERNS[index][0], PATTERNS[index][1]);
    }
    return output;
  }

  function translateAttribute(element, attribute) {
    var value = element.getAttribute(attribute);
    if (!value) return;
    var translated = translateText(value);
    if (translated !== value) element.setAttribute(attribute, translated);
  }

  function translateElement(element) {
    if (!element || element.nodeType !== 1) return;
    var tag = element.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE') return;
    translateAttribute(element, 'placeholder');
    translateAttribute(element, 'title');
    translateAttribute(element, 'aria-label');
    var walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    var node = walker.nextNode();
    while (node) {
      var translated = translateText(node.nodeValue);
      if (translated !== node.nodeValue) node.nodeValue = translated;
      node = walker.nextNode();
    }
  }

  var translating = false;

  function apply(root) {
    if (LANG !== 'fr' || translating) return;
    translating = true;
    translateElement(root || document.body);
    translating = false;
  }

  function start() {
    if (LANG !== 'fr') return;
    apply(document.body);
    var observer = new MutationObserver(function (mutations) {
      if (translating) return;
      translating = true;
      for (var index = 0; index < mutations.length; index += 1) {
        var mutation = mutations[index];
        if (mutation.type === 'attributes') {
          translateAttribute(mutation.target, mutation.attributeName);
        } else {
          for (var childIndex = 0; childIndex < mutation.addedNodes.length; childIndex += 1) {
            var node = mutation.addedNodes[childIndex];
            if (node.nodeType === 3) {
              var translated = translateText(node.nodeValue);
              if (translated !== node.nodeValue) node.nodeValue = translated;
            } else {
              translateElement(node);
            }
          }
        }
      }
      translating = false;
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label'],
    });
  }

  global.JanitouI18n = { lang: LANG, apply: apply, start: start, translateText: translateText };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(window);
