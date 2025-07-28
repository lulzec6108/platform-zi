// code.gs (REVISED & SECURED)

const ss = SpreadsheetApp.getActiveSpreadsheet();
const SCRIPT_API_KEY = PropertiesService.getScriptProperties().getProperty('API_KEY');

// --- Fungsi Utility ---
function sendJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// --- Handlers Utama ---
function doGet(e) {
  // Logger.log('doGet received parameters: ' + JSON.stringify(e.parameter));

  // Validasi API Key
  if (!e || !e.parameter || !e.parameter.apiKey || e.parameter.apiKey !== SCRIPT_API_KEY) {
    return sendJSON({ success: false, message: 'Akses Ditolak: API Key tidak valid atau tidak ada.' });
  }

  const action = e.parameter.action;
  const payload = e.parameter; // Semua parameter adalah payload
  let result;

  try {
    // Routing berdasarkan parameter 'action'
    switch (action) {
      case 'login':
        result = handleLogin(payload);
        break;
      case 'getDashboardTugasStatus':
        result = handleGetDashboardTugasStatus(payload);
        break;
      case 'getLinkPendukung':
        result = handleGetLinkPendukung(payload);
        break;
      case 'getTugasSaya':
        result = handleGetTugasSaya(payload);
        break;
      case 'getKinerjaTim': // <-- BARU: Daftarkan aksi baru
        result = handleGetKinerjaTim(payload);
        break;
      default:
        result = { success: false, message: 'Aksi GET tidak valid.' };
        break;
    }
  } catch (err) {
    Logger.log(`Error in doGet action '${action}': ${err.message} Stack: ${err.stack}`);
    result = { success: false, message: `Terjadi kesalahan server pada aksi: ${action}. Detail: ${err.message}` };
  }

  return sendJSON(result);
}

function doPost(e) {
  let response;
  try {
    // FIX: Ekstrak action dan payload dari body request
    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    const payload = request; // Seluruh body adalah payload

    if (!action) {
      throw new Error("Aksi POST tidak valid.");
    }

    switch (action) {
      case 'login':
        response = handleLogin(payload);
        break;
      case 'saveBuktiDukung':
        response = handleSaveBuktiDukung(payload);
        break;
      case 'setStatusPenilaian':
        response = handleSetStatusPenilaian(payload);
        break;
      default:
        response = { success: false, message: 'Aksi POST tidak valid.' };
        break;
    }
  } catch (error) {
    response = { success: false, message: 'Gagal memproses permintaan POST: ' + error.message };
  }
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

// --- FUNGSI-FUNGSI LOGIKA BISNIS ANDA ---
function handleGetDashboardTugasStatus(payload) {
  const user = getUserInfo(payload.username);
  if (!user || !user.username) return { success: false, message: 'User tidak ditemukan' };

  const tugasSheet = ss.getSheetByName("MappingTugas");
  const tugasData = tugasSheet.getDataRange().getValues();
  const buktiSheet = ss.getSheetByName("BuktiDukung");
  const buktiData = buktiSheet.getDataRange().getValues();
  const usersSheet = ss.getSheetByName("Users");
  const usersData = usersSheet.getDataRange().getValues();

  const usernameToNama = {};
  for (let i = 1; i < usersData.length; i++) {
    usernameToNama[usersData[i][0]] = usersData[i][2];
  }

  const hasil = [];
  for (let i = 1; i < tugasData.length; i++) {
    const row = tugasData[i];
    const kode = row[6];
    const pilar = row[1];
    const tugasUsername = row[0];
    const namaLengkap = usernameToNama[tugasUsername] || tugasUsername;

    let tampil = false;
    if (user.role && user.role.toLowerCase() === "admin") tampil = true;
    else if (user.role && user.role.toLowerCase() === "ketua pilar" && user.pilar === pilar) tampil = true;
    else if (user.role && user.role.toLowerCase() === "anggota" && user.username === tugasUsername) tampil = true;
    if (!tampil) continue;

    let ada = false;
    let statusKetua = "", catatanKetua = "", statusAdmin = "", catatanAdmin = "";
    for (let j = 1; j < buktiData.length; j++) {
      if (buktiData[j][0] == tugasUsername && buktiData[j][1] == kode) {
        ada = (buktiData[j][3] && buktiData[j][3].toString().trim() !== "") || (buktiData[j][2] && buktiData[j][2].toString().trim() !== "");
        statusKetua = buktiData[j][5] || "";
        catatanKetua = buktiData[j][6] || "";
        statusAdmin = buktiData[j][7] || "";
        catatanAdmin = buktiData[j][8] || "";
        break;
      }
    }
    hasil.push({
      kode: kode,
      pilar: pilar,
      nama: row[5],
      tugasUsername: tugasUsername,
      namaLengkap: namaLengkap,
      statusAnggota: ada ? "Sudah dikerjakan" : "Belum dikerjakan",
      statusKetua: statusKetua,
      catatanKetua: catatanKetua,
      statusAdmin: statusAdmin,
      catatanAdmin: catatanAdmin,
      linkReferensiMelawi: row[9] || "",
      linkGDriveBukti: row[10] || ""
    });
  }
  return { success: true, data: hasil };
}

function handleGetMappingTugasForUser(payload) {
  const user = getUserInfo(payload.username);
  if (!user || !user.username) return { success: false, message: 'User tidak ditemukan' };

  const tugasSheet = ss.getSheetByName("MappingTugas");
  const tugasData = tugasSheet.getDataRange().getValues();
  const hasil = [];

  for (let i = 1; i < tugasData.length; i++) {
    const row = tugasData[i];
    if (row[0] === user.username) {
      hasil.push({ pilar: row[1], kategori: row[2], subkategori: row[3], tugas: row[4], definisi: row[5], kode: row[6] });
    }
  }
  return { success: true, data: hasil };
}

function handleGetBuktiDukung(payload) {
  var sheet = ss.getSheetByName("BuktiDukung");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == payload.username && data[i][1] == payload.kodeHirarki) {
      return { 
        success: true, 
        data: {
          nilai: data[i][2], 
          jenis: data[i][3],
          statusKetua: data[i][5] || "",
          catatanKetua: data[i][6] || "",
          statusAdmin: data[i][7] || "",
          catatanAdmin: data[i][8] || ""
        }
      };
    }
  }
  return { success: true, data: { nilai: "", jenis: "", statusKetua: "", catatanKetua: "", statusAdmin: "", catatanAdmin: "" } };
}

function handleGetLinkPendukung(payload) {
  const user = getUserInfo(payload.username);
  if (!user || !user.username) {
    return { success: false, message: 'User tidak ditemukan' };
  }

  const sheet = ss.getSheetByName("LinkPendukung"); // FIX: Nama sheet disesuaikan (tanpa spasi)
  if (!sheet) {
    // Jika sheet tidak ditemukan, kirim pesan error yang jelas
    Logger.log('Error: Sheet dengan nama "LinkPendukung" tidak ditemukan.');
    return { success: false, message: 'Sheet "LinkPendukung" tidak ditemukan.' };
  }
  const data = sheet.getDataRange().getValues();
  const headers = data.shift(); // Ambil header untuk dijadikan key

  const result = data.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      // Mengubah header menjadi snake_case untuk konsistensi kunci JSON
      const key = header.trim().toLowerCase().replace(/\s+/g, '_');
      obj[key] = row[index];
    });
    return obj;
  }).filter(item => Object.keys(item).length > 0 && item.judul_link && item.alamat_link); // Filter baris kosong

  return { success: true, data: result };
}

function handleGetTugasSaya(payload) {
  const user = getUserInfo(payload.username);
  if (!user || !user.username) return { success: false, message: 'User tidak ditemukan' };

  const tugasSheet = ss.getSheetByName("MappingTugas");
  const tugasData = tugasSheet.getDataRange().getValues();
  const tugasHeaders = tugasData.shift(); // Ambil header untuk pencarian kolom dinamis

  // Dapatkan indeks kolom dari header
  const usernameIndex = tugasHeaders.indexOf('Username');
  const tingkatan1Index = tugasHeaders.indexOf('Tingkatan 1');
  const tingkatan2Index = tugasHeaders.indexOf('Tingkatan 2');
  const tingkatan3Index = tugasHeaders.indexOf('Tingkatan 3');
  const tingkatan4Index = tugasHeaders.indexOf('Tingkatan 4');
  const panduanIndex = tugasHeaders.indexOf('Panduan Penilaian');
  const kodeHirarkiIndex = tugasHeaders.indexOf('Kode Hirarki');
  const pilihanJawabanIndex = tugasHeaders.indexOf('Pilihan Jawaban');
  // === PENAMBAHAN BARU ===
  const linkReferensiIndex = tugasHeaders.indexOf('Link Referensi Melawi');
  const linkGDriveBuktiIndex = tugasHeaders.indexOf('Link GDrive Bukti');

  const buktiSheet = ss.getSheetByName("BuktiDukung");
  const buktiData = buktiSheet.getDataRange().getValues();
  const buktiHeaders = buktiData.shift();

  // Buat map dari bukti dukung untuk pencarian cepat (O(1) lookup)
  const buktiDukungMap = buktiData.reduce((map, row) => {
    const username = row[buktiHeaders.indexOf('Username')];
    const kodeHirarki = row[buktiHeaders.indexOf('Kode Hirarki')];
    if (username && kodeHirarki) {
      map[`${username}-${kodeHirarki}`] = {
        nilai: row[buktiHeaders.indexOf('Nilai')],
        jenisBuktiDukung: row[buktiHeaders.indexOf('Jenis Bukti Dukung')],
        timestamp: row[buktiHeaders.indexOf('Timestamp')]
      };
    }
    return map;
  }, {});

  const userTugas = [];
  tugasData.forEach(row => {
    const tugasUsername = row[usernameIndex];
    if (tugasUsername === user.username) {
      const kodeHirarki = row[kodeHirarkiIndex];
      const buktiKey = `${user.username}-${kodeHirarki}`;
      const bukti = buktiDukungMap[buktiKey] || {}; // Ambil bukti atau objek kosong

      // Tentukan status pengerjaan berdasarkan keberadaan data di BuktiDukung
      const statusPengerjaan = buktiDukungMap.hasOwnProperty(buktiKey) ? "SEDANG DIKERJAKAN" : "BELUM DIKERJAKAN";

      userTugas.push({
        username: tugasUsername,
        pilar: row[1],
        tingkatan1: row[tingkatan1Index],
        tingkatan2: row[tingkatan2Index],
        tingkatan3: row[tingkatan3Index],
        tingkatan4: row[tingkatan4Index],
        kodeHirarki: kodeHirarki,
        panduanPenilaian: row[panduanIndex],
        pilihanJawaban: row[pilihanJawabanIndex],
        // === PENAMBAHAN BARU ===
        linkReferensi: linkReferensiIndex !== -1 ? row[linkReferensiIndex] : '',
        linkGDriveBukti: linkGDriveBuktiIndex !== -1 ? row[linkGDriveBuktiIndex] : '',
        // Gabungkan dengan data dari bukti dukung
        nilai: bukti.nilai || '',
        jenisBuktiDukung: bukti.jenisBuktiDukung || '',
        // Tambahkan status pengerjaan
        statusPengerjaan: statusPengerjaan
      });
    }
  });

  return { success: true, data: userTugas };
}

function handleGetKinerjaTim(payload) {
  const sheet = ss.getSheetByName("BuktiDukung");
  const data = sheet.getDataRange().getValues();
  // Logika untuk mengambil dan memfilter data kinerja tim akan ditambahkan di sini
  return { success: true, data: data }; // Placeholder
}

function handleLogin(payload) {
  const { username, password } = payload;
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users'); 
    if (!sheet) {
      return { success: false, message: 'Error: Sheet dengan nama \'Users\' tidak ditemukan.' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    
    const usernameIndex = headers.indexOf('Username');
    const passwordIndex = headers.indexOf('Password');
    const namaIndex = headers.indexOf('Nama Lengkap');
    const pilarIndex = headers.indexOf('Pilar');
    const roleIndex = headers.indexOf('Role');

    for (const row of data) {
      if (row[usernameIndex] === username && row[passwordIndex].toString() === password.toString()) {
        return {
          success: true,
          data: {
            username: row[usernameIndex],
            nama: row[namaIndex],
            pilar: row[pilarIndex],
            role: row[roleIndex]
          }
        };
      }
    }
    
    return { success: false, message: 'Username atau password salah.' };

  } catch (e) {
    Logger.log('Login error: ' + e.toString());
    return { success: false, message: 'Terjadi kesalahan pada server saat login.' };
  }
}

function handleSaveBuktiDukung(payload) {
  const sheet = ss.getSheetByName("BuktiDukung");
  const data = sheet.getDataRange().getValues();
  const headers = data.shift(); // Ambil header

  const usernameIndex = headers.indexOf('Username');
  const kodeIndex = headers.indexOf('Kode Hirarki');
  const nilaiIndex = headers.indexOf('Nilai');
  const jenisIndex = headers.indexOf('Jenis Bukti Dukung');
  const timestampIndex = headers.indexOf('Timestamp');
  const statusUserIndex = headers.indexOf('Status User'); // <-- BARU: Dapatkan indeks kolom status

  // Dapatkan username dari payload (dikirim otomatis oleh callApi)
  const username = payload.username;
  if (!username) {
      return { success: false, message: 'Sesi pengguna tidak ditemukan. Silakan login ulang.' };
  }

  // Cari baris yang cocok
  for (let i = 0; i < data.length; i++) {
    if (data[i][usernameIndex] == username && data[i][kodeIndex] == payload.kodeHirarki) {
      sheet.getRange(i + 2, nilaiIndex + 1).setValue(payload.nilai);
      sheet.getRange(i + 2, jenisIndex + 1).setValue(payload.jenisBuktiDukung);
      sheet.getRange(i + 2, timestampIndex + 1).setValue(new Date());
      if (statusUserIndex !== -1) {
        sheet.getRange(i + 2, statusUserIndex + 1).setValue("Tersimpan"); // <-- BARU: Set status
      }
      return { success: true, message: "Bukti dukung berhasil diperbarui." };
    }
  }

  // Jika tidak ditemukan, tambahkan baris baru
  const newRow = new Array(headers.length).fill('');
  newRow[usernameIndex] = username;
  newRow[kodeIndex] = payload.kodeHirarki;
  newRow[nilaiIndex] = payload.nilai;
  newRow[jenisIndex] = payload.jenisBuktiDukung;
  newRow[timestampIndex] = new Date();
  if (statusUserIndex !== -1) {
    newRow[statusUserIndex] = "Tersimpan"; // <-- BARU: Set status
  }
  
  sheet.appendRow(newRow);
  return { success: true, message: "Bukti dukung berhasil disimpan." };
}

function handleSetStatusPenilaian(payload) {
  var sheet = ss.getSheetByName("BuktiDukung");
  var data = sheet.getDataRange().getValues();
  var colStatus = payload.role === "admin" ? 7 : 5;
  var colCatatan = payload.role === "admin" ? 8 : 6;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][1] && data[i][0] == payload.username && data[i][1] == payload.kodeHirarki) {
      sheet.getRange(i+1, colStatus+1).setValue(payload.status);
      sheet.getRange(i+1, colCatatan+1).setValue(payload.catatan);
      return { success: true, message: "Status berhasil diperbarui." };
    }
  }
  var row = [payload.username, payload.kodeHirarki, "", "", new Date(), "", "", "", ""];
  row[colStatus] = payload.status;
  row[colCatatan] = payload.catatan;
  sheet.appendRow(row);
  return { success: true, message: "Status berhasil ditambahkan." };
}

function getUserInfo(username) {
  if (!username) return {};
  var sheet = ss.getSheetByName("Users");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == username) {
      return { username: username, nama: data[i][2], pilar: data[i][3], role: data[i][4] };
    }
  }
  return {};
}
