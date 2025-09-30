// Bu fonksiyon, teknik olay adlarını kullanıcı dostu etiketlere çevirir.

const eventTranslations = {
  page_view: 'Sayfa Görüntüleme',
  login_successful: 'Başarılı Giriş',
  registration_started: 'Kayıt Başlatıldı',
  registration_completed: 'Kayıt Tamamlandı',
  deposit_page_view: 'Para Yatırma Sayfası Görüntülendi',
  deposit_successful: 'Başarılı Para Yatırma',
  deposit_failed: 'Başarısız Para Yatırma',
  // Gelecekte eklenecek yeni olayları buraya ekleyebilirsiniz.
};

export const translateEventName = (eventName) => {
  // Eğer çeviri listesinde bir karşılığı varsa onu, yoksa orijinal adı döndür.
  return eventTranslations[eventName] || eventName;
};
