const fs = require('fs');

const path = './src/i18n.tsx';
let content = fs.readFileSync(path, 'utf8');

const additionalTranslations = {
  'common.trades': { en: 'Trades', bn: 'ট্রেড', hi: 'ट्रेड्स', es: 'Operaciones', pt: 'Negociações', ru: 'Сделки', ar: 'تداولات', tr: 'İşlemler', vi: 'Giao dịch', id: 'Perdagangan' },
  'account.demo': { en: 'Demo Account', bn: 'ডেমো অ্যাকাউন্ট', hi: 'डेमो खाता', es: 'Cuenta Demo', pt: 'Conta de Demonstração', ru: 'Демо-счет', ar: 'حساب تجريبي', tr: 'Demo Hesabı', vi: 'Tài khoản Demo', id: 'Akun Demo' },
  'account.real': { en: 'Real Account', bn: 'রিয়েল অ্যাকাউন্ট', hi: 'वास्तविक खाता', es: 'Cuenta Real', pt: 'Conta Real', ru: 'Реальный счет', ar: 'حساب حقيقي', tr: 'Gerçek Hesap', vi: 'Tài khoản Thực', id: 'Akun Riil' },
  'nav.terminal': { en: 'Terminal', bn: 'টার্মিনাল', hi: 'टर्मिनल', es: 'Terminal', pt: 'Terminal', ru: 'Терминал', ar: 'محطة', tr: 'Terminal', vi: 'Thiết bị đầu cuối', id: 'Terminal' },
  'nav.help': { en: 'Help & Support', bn: 'সাহায্য ও সাপোর্ট', hi: 'सहायता और समर्थन', es: 'Ayuda y soporte', pt: 'Ajuda e Suporte', ru: 'Помощь и поддержка', ar: 'المساعدة والدعم', tr: 'Yardım ve Destek', vi: 'Trợ giúp & Hỗ trợ', id: 'Bantuan & Dukungan' },
  'nav.social': { en: 'Social Trading', bn: 'সোশ্যাল ট্রেডিং', hi: 'सोशल ट्रेडिंग', es: 'Trading Social', pt: 'Negociação Social', ru: 'Социальный трейдинг', ar: 'التداول الاجتماعي', tr: 'Sosyal Ticaret', vi: 'Giao dịch Xã hội', id: 'Social Trading' },
  'nav.tournaments': { en: 'Tournaments', bn: 'টুর্নামেন্ট', hi: 'टूर्नामेंट', es: 'Torneos', pt: 'Torneios', ru: 'Турниры', ar: 'البطولات', tr: 'Turnuvalar', vi: 'Giải đấu', id: 'Turnamen' },
  'nav.calendar': { en: 'Economic Calendar', bn: 'অর্থনৈতিক ক্যালেন্ডার', hi: 'आर्थिक कैलेंडर', es: 'Calendario Económico', pt: 'Calendário Econômico', ru: 'Экономический календарь', ar: 'المفكرة الاقتصادية', tr: 'Ekonomik Takvim', vi: 'Lịch Kinh tế', id: 'Kalender Ekonomi' },
  'nav.leaderboard': { en: 'Leaderboard', bn: 'লিডারবোর্ড', hi: 'लीडरबोर्ड', es: 'Tabla de clasificación', pt: 'Tabela de classificação', ru: 'Таблица лидеров', ar: 'لوحة الصدارة', tr: 'Lider Tablosu', vi: 'Bảng xếp hạng', id: 'Papan Peringkat' },
  'nav.info': { en: 'Info', bn: 'তথ্য', hi: 'जानकारी', es: 'Información', pt: 'Informações', ru: 'Информация', ar: 'معلومات', tr: 'Bilgi', vi: 'Thông tin', id: 'Info' },
  'common.open_trades': { en: 'Open Trades', bn: 'ওপেন ট্রেড', hi: 'ओपन ट्रेड्स', es: 'Operaciones Abiertas', pt: 'Negociações Abertas', ru: 'Открытые сделки', ar: 'تداولات مفتوحة', tr: 'Açık İşlemler', vi: 'Giao dịch Mở', id: 'Perdagangan Terbuka' },
  'common.closed_trades': { en: 'Closed Trades', bn: 'ক্লোজড ট্রেড', hi: 'बंद ट्रेड्स', es: 'Operaciones Cerradas', pt: 'Negociações Fechadas', ru: 'Закрытые сделки', ar: 'تداولات مغلقة', tr: 'Kapalı İşlemler', vi: 'Giao dịch đã đóng', id: 'Perdagangan Tertutup' },
  'common.active': { en: 'Active', bn: 'সক্রিয়', hi: 'सक्रिय', es: 'Activo', pt: 'Ativo', ru: 'Активный', ar: 'نشط', tr: 'Aktif', vi: 'Hoạt động', id: 'Aktif' },
  'common.total_trades': { en: 'Total Trades', bn: 'মোট ট্রেড', hi: 'कुल ट्रेड्स', es: 'Operaciones Totales', pt: 'Total de Negociações', ru: 'Всего сделок', ar: 'إجمالي التداولات', tr: 'Toplam İşlem', vi: 'Tổng giao dịch', id: 'Total Perdagangan' },
  'common.assets': { en: 'Assets', bn: 'সম্পদ', hi: 'संपत्ति', es: 'Activos', pt: 'Ativos', ru: 'Активы', ar: 'أصول', tr: 'Varlıklar', vi: 'Tài sản', id: 'Aset' },
  'common.payout': { en: 'Payout', bn: 'পেআউট', hi: 'पेआउट', es: 'Pago', pt: 'Pagamento', ru: 'Выплата', ar: 'عائد', tr: 'Ödeme', vi: 'Thanh toán', id: 'Pembayaran' },
  'common.time': { en: 'Time', bn: 'সময়', hi: 'समय', es: 'Tiempo', pt: 'Tempo', ru: 'Время', ar: 'وقت', tr: 'Zaman', vi: 'Thời gian', id: 'Waktu' },
  'common.amount': { en: 'Amount', bn: 'পরিমাণ', hi: 'मात्रा', es: 'Cantidad', pt: 'Valor', ru: 'Сумма', ar: 'مبلغ', tr: 'Miktar', vi: 'Số tiền', id: 'Jumlah' },
  'common.strike_price': { en: 'Strike Price', bn: 'স্ট্রাইক প্রাইস', hi: 'स्ट्राइक प्राइस', es: 'Precio de Ejercicio', pt: 'Preço de Exercício', ru: 'Цена исполнения', ar: 'سعر التنفيذ', tr: 'Kullanım Fiyatı', vi: 'Giá thực hiện', id: 'Harga Kesepakatan' },
  'common.profit': { en: 'Profit', bn: 'লাভ', hi: 'लाभ', es: 'Beneficio', pt: 'Lucro', ru: 'Прибыль', ar: 'ربح', tr: 'Kar', vi: 'Lợi nhuận', id: 'Keuntungan' },
  'common.duration': { en: 'Duration', bn: 'সময়কাল', hi: 'अवधि', es: 'Duración', pt: 'Duração', ru: 'Длительность', ar: 'المدة', tr: 'Süre', vi: 'Thời lượng', id: 'Durasi' },
  'common.up': { en: 'Up', bn: 'উপরে', hi: 'ऊपर', es: 'Arriba', pt: 'Para cima', ru: 'Вверх', ar: 'أعلى', tr: 'Yukarı', vi: 'Lên', id: 'Naik' },
  'common.down': { en: 'Down', bn: 'নিচে', hi: 'नीचे', es: 'Abajo', pt: 'Para baixo', ru: 'Вниз', ar: 'أسفل', tr: 'Aşağı', vi: 'Xuống', id: 'Turun' },
  'common.fixed_time_mode': { en: 'Fixed Time Mode', bn: 'স্থির সময় মোড', hi: 'निश्चित समय मोड', es: 'Modo de tiempo fijo', pt: 'Modo de tempo fixo', ru: 'Режим фиксированного времени', ar: 'وضع الوقت الثابت', tr: 'Sabit Zaman Modu', vi: 'Chế độ thời gian cố định', id: 'Mode Waktu Tetap' },
  'common.investment': { en: 'Investment', bn: 'বিনিয়োগ', hi: 'निवेश', es: 'Inversión', pt: 'Investimento', ru: 'Инвестиции', ar: 'استثمار', tr: 'Yatırım', vi: 'Đầu tư', id: 'Investasi' },
  'nav.accounts': { en: 'Accounts', bn: 'অ্যাকাউন্ট', hi: 'खाते', es: 'Cuentas', pt: 'Contas', ru: 'Счета', ar: 'حسابات', tr: 'Hesaplar', vi: 'Tài khoản', id: 'Akun' },
  'common.deposit': { en: 'Deposit', bn: 'ডিপোজিট', hi: 'जमा', es: 'Depósito', pt: 'Depósito', ru: 'Депозит', ar: 'إيداع', tr: 'Para Yatır', vi: 'Nạp tiền', id: 'Deposit' },
  'common.withdraw': { en: 'Withdraw', bn: 'উত্তোলন', hi: 'निकालना', es: 'Retirar', pt: 'Retirar', ru: 'Вывод', ar: 'سحب', tr: 'Para Çek', vi: 'Rút tiền', id: 'Tarik Dana' },
  'common.transfers': { en: 'Transfers', bn: 'ট্রান্সফার', hi: 'स्थानान्तरण', es: 'Transferencias', pt: 'Transferências', ru: 'Переводы', ar: 'التحويلات', tr: 'Transferler', vi: 'Chuyển khoản', id: 'Transfer' },
};

let str = '';
for (const [key, value] of Object.entries(additionalTranslations)) {
  if (!content.includes(`'${key}':`)) {
    str += `  '${key}': ${JSON.stringify(value, null, 4).replace(/\\n/g, '').replace(/\}$/, '  },')}\n`;
  }
}

if (str) {
  content = content.replace('export const translations: TranslationData = {', 'export const translations: TranslationData = {\n' + str);
  fs.writeFileSync(path, content, 'utf8');
  console.log("Translations added.");
} else {
  console.log("No new translations needed.");
}
