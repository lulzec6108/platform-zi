// code.gs (FINAL)

const ss = SpreadsheetApp.getActiveSpreadsheet();

// --- Fungsi Validasi ---
function isValidRequest(e) {
  const SCRIPT_API_KEY = PropertiesService.getScriptProperties().getProperty('API_KEY');
  if (!SCRIPT_API_KEY) return false;

  if (!e || !e.parameter) {
    return false;
  }

  const receivedKey = e.parameter.apiKey;
  return receivedKey === SCRIPT_API_KEY;
}

// --- Fungsi Utility ---
function sendJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// --- Handlers Utama ---
function doGet(e) {
  if (!isValidRequest(e)) {
    return sendJSON({ success: false, message: 'Akses Ditolak' });
  }

  const action = e.parameter.action;
  const payload = e.parameter;

  switch (action) {
    case 'getDashboardTugasStatus':
      return handleGetDashboardTugasStatus(payload);
    case 'getMappingTugasForUser':
      return handleGetMappingTugasForUser(payload);
    case 'getBuktiDukung':
      return handleGetBuktiDukung(payload);
    case 'getLinkPendukung':
      return handleGetLinkPendukung();
    default:
      return sendJSON({ success: false, message: 'Aksi GET tidak valid.' });
  }
}

function doPost(e) {
  if (!isValidRequest(e)) {
    return sendJSON({ success: false, message: 'Akses Ditolak' });
  }

  let response;
  try {
    const payload = JSON.parse(e.postData.contents);
    switch (payload.action) {
      case 'login':
        response = handleLogin(payload.payload); 
        break;
      case 'getDashboardData':
        response = getDashboardData(payload.payload); 
        break;
      case 'saveBuktiDukung':
        response = handleSaveBuktiDukung(payload.payload);
        break;
      case 'setStatusPenilaian':
        response = handleSetStatusPenilaian(payload.payload);
        break;
      default:
        response = { success: false, message: 'Aksi POST tidak valid.' };
    }
  } catch (err) {
    response = { success: false, message: 'Invalid request: ' + err.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- FUNGSI-FUNGSI LOGIKA BISNIS ANDA ---
function handleGetDashboardTugasStatus(payload) {
  var user = getUserInfo(payload.username);
  if (!user || !user.username) return sendJSON({ success: false, message: 'User tidak ditemukan' });
  var tugasSheet = ss.getSheetByName("MappingTugas");
  var tugasData = tugasSheet.getDataRange().getValues();
  var buktiSheet = ss.getSheetByName("BuktiDukung");
  var buktiData = buktiSheet.getDataRange().getValues();
  var usersSheet = ss.getSheetByName("Users");
  var usersData = usersSheet.getDataRange().getValues();
  var usernameToNama = {};
  for (var i = 1; i < usersData.length; i++) {
    usernameToNama[usersData[i][0]] = usersData[i][2];
  }
  var hasil = [];
  for (var i = 1; i < tugasData.length; i++) {
    var row = tugasData[i];
    var kode = row[6];
    var pilar = row[1];
    var tugasUsername = row[0];
    var namaLengkap = usernameToNama[tugasUsername] || tugasUsername;
    var tampil = false;
    if (user.role && user.role.toLowerCase() === "admin") tampil = true;
    else if (user.role && user.role.toLowerCase() === "ketua pilar" && user.pilar === pilar) tampil = true;
    else if (user.role && user.role.toLowerCase() === "anggota" && user.username === tugasUsername) tampil = true;
    if (!tampil) continue;
    var ada = false;
    var statusKetua = "", catatanKetua = "", statusAdmin = "", catatanAdmin = "";
    for (var j = 1; j < buktiData.length; j++) {
      if (
        buktiData[j][0] == tugasUsername &&
        buktiData[j][1] == kode
      ) {
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
      statusAnggota: ada ? "Sedang dikerjakan" : "Belum mengerjakan",
      statusKetua: statusKetua,
      catatanKetua: catatanKetua,
      statusAdmin: statusAdmin,
      catatanAdmin: catatanAdmin,
      linkReferensiMelawi: row[9] || "",
      linkGDriveBukti: row[10] || ""
    });
  }
  return sendJSON(hasil);
}

function handleGetMappingTugasForUser(payload) {
  var mappingSheet = ss.getSheetByName("MappingTugas");
  var mapping = mappingSheet.getDataRange().getValues();
  var headers = mapping[0];
  var res = [];
  for (var i = 1; i < mapping.length; i++) {
    if (mapping[i][0] == payload.username) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = mapping[i][j];
      }
      res.push(row);
    }
  }
  return sendJSON(res);
}

function handleGetBuktiDukung(payload) {
  var sheet = ss.getSheetByName("BuktiDukung");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == payload.username && data[i][1] == payload.kodeHirarki) {
      return sendJSON({ 
        nilai: data[i][2], 
        jenis: data[i][3],
        statusKetua: data[i][5] || "",
        catatanKetua: data[i][6] || "",
        statusAdmin: data[i][7] || "",
        catatanAdmin: data[i][8] || ""
      });
    }
  }
  return sendJSON({ nilai: "", jenis: "", statusKetua: "", catatanKetua: "", statusAdmin: "", catatanAdmin: "" });
}

function handleGetLinkPendukung() {
  var sheet = ss.getSheetByName("LinkPendukung");
  if (!sheet) return sendJSON([]);
  var data = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][1]) {
      result.push({
        deskripsi: data[i][0],
        link: data[i][1]
      });
    }
  }
  return sendJSON(result);
}

function handleLogin(payload) {
  const { username, password } = payload;
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users'); // FIX: 'user' -> 'Users'
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
          user: {
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
  var sheet = ss.getSheetByName("BuktiDukung");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == payload.username && data[i][1] == payload.kodeHirarki) {
      sheet.getRange(i+1, 3).setValue(payload.nilai);
      sheet.getRange(i+1, 4).setValue(payload.jenis);
      sheet.getRange(i+1, 5).setValue(new Date());
      return sendJSON({ success: true, message: "Bukti dukung diperbarui." });
    }
  }
  sheet.appendRow([payload.username, payload.kodeHirarki, payload.nilai, payload.jenis, new Date(), "", "", "", ""]);
  return sendJSON({ success: true, message: "Bukti dukung disimpan." });
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
      return sendJSON({ success: true, message: "Status berhasil diperbarui." });
    }
  }
  var row = [payload.username, payload.kodeHirarki, "", "", new Date(), "", "", "", ""];
  row[colStatus] = payload.status;
  row[colCatatan] = payload.catatan;
  sheet.appendRow(row);
  return sendJSON({ success: true, message: "Status berhasil ditambahkan." });
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

function getDashboardData(payload) {
  const { username } = payload;
  if (!username) {
    return { success: false, message: 'Username tidak ditemukan.' };
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const usersSheet = ss.getSheetByName('Users');
    const tugasSheet = ss.getSheetByName('MappingTugas');
    const buktiSheet = ss.getSheetByName('BuktiDukung');

    // 1. Dapatkan info user yang login
    const usersData = usersSheet.getDataRange().getValues();
    let currentUserInfo = null;
    const usersHeaders = usersData.shift();
    const userUsernameIndex = usersHeaders.indexOf('Username');
    const userNamaIndex = usersHeaders.indexOf('Nama Lengkap');
    const userPilarIndex = usersHeaders.indexOf('Pilar');
    const userRoleIndex = usersHeaders.indexOf('Role');

    for (const row of usersData) {
      if (row[userUsernameIndex] === username) {
        currentUserInfo = {
          username: row[userUsernameIndex],
          nama: row[userNamaIndex],
          pilar: row[userPilarIndex],
          role: row[userRoleIndex]
        };
        break;
      }
    }

    if (!currentUserInfo) {
      return { success: false, message: 'User tidak valid.' };
    }

    // 2. Buat map username -> nama lengkap
    const usernameToNama = {};
    usersData.forEach(row => {
      usernameToNama[row[userUsernameIndex]] = row[userNamaIndex];
    });

    // 3. Baca data tugas dan bukti
    const tugasData = tugasSheet.getDataRange().getValues();
    const buktiData = buktiSheet.getDataRange().getValues();
    const tugasHeaders = tugasData.shift();
    const buktiHeaders = buktiData.shift();

    // Index kolom untuk performa
    const tugasUsernameIndex = tugasHeaders.indexOf('Username');
    const tugasPilarIndex = tugasHeaders.indexOf('Pilar');
    const tugasKodeIndex = tugasHeaders.indexOf('Kode Hirarki');
    const tugasNamaIndex = tugasHeaders.indexOf('Tingkatan 4'); // Nama tugas
    const tugasRefIndex = tugasHeaders.indexOf('Link Referensi Melawi');
    const tugasGDriveIndex = tugasHeaders.indexOf('Link GDrive Bukti');

    const buktiUsernameIndex = buktiHeaders.indexOf('Username');
    const buktiKodeIndex = buktiHeaders.indexOf('Kode Hirarki');
    const buktiNilaiIndex = buktiHeaders.indexOf('Nilai');
    const buktiJenisIndex = buktiHeaders.indexOf('Jenis');
    const buktiStatusKetuaIndex = buktiHeaders.indexOf('Status Ketua');
    const buktiCatatanKetuaIndex = buktiHeaders.indexOf('Catatan Ketua');
    const buktiStatusAdminIndex = buktiHeaders.indexOf('Status Admin');
    const buktiCatatanAdminIndex = buktiHeaders.indexOf('Catatan Admin');

    // 4. Proses dan filter tugas
    const hasil = [];
    for (const row of tugasData) {
      const pilar = row[tugasPilarIndex];
      const tugasUsername = row[tugasUsernameIndex];
      let tampil = false;

      // Logika filter berdasarkan peran
      const userRole = (currentUserInfo.role || '').toLowerCase();
      if (userRole === 'admin') {
        tampil = true;
      } else if (userRole === 'ketua pilar' && currentUserInfo.pilar === pilar) {
        tampil = true;
      } else if (userRole === 'anggota' && currentUserInfo.username === tugasUsername) {
        tampil = true;
      }

      if (!tampil) continue;

      // Cari bukti dukung
      const kode = row[tugasKodeIndex];
      let adaBukti = false;
      let statusKetua = '', catatanKetua = '', statusAdmin = '', catatanAdmin = '';
      for (const buktiRow of buktiData) {
        if (buktiRow[buktiUsernameIndex] === tugasUsername && buktiRow[buktiKodeIndex] === kode) {
          adaBukti = (buktiRow[buktiNilaiIndex] && buktiRow[buktiNilaiIndex].toString().trim() !== '') || 
                     (buktiRow[buktiJenisIndex] && buktiRow[buktiJenisIndex].toString().trim() !== '');
          statusKetua = buktiRow[buktiStatusKetuaIndex] || '';
          catatanKetua = buktiRow[buktiCatatanKetuaIndex] || '';
          statusAdmin = buktiRow[buktiStatusAdminIndex] || '';
          catatanAdmin = buktiRow[buktiCatatanAdminIndex] || '';
          break;
        }
      }

      hasil.push({
        'Kode': kode,
        'Pilar': pilar,
        'Nama Tugas': row[tugasNamaIndex],
        'PIC': usernameToNama[tugasUsername] || tugasUsername,
        'Status Pengerjaan': adaBukti ? 'Sudah dikerjakan' : 'Belum dikerjakan',
        'Status Ketua Pilar': statusKetua,
        'Status Admin': statusAdmin,
        // Data tambahan untuk modal/detail
        'tugasUsername': tugasUsername,
        'catatanKetua': catatanKetua,
        'catatanAdmin': catatanAdmin,
        'linkReferensi': row[tugasRefIndex] || '',
        'linkGDrive': row[tugasGDriveIndex] || ''
      });
    }

    return { success: true, data: hasil };

  } catch (e) {
    Logger.log('getDashboardData Error: ' + e.toString() + ' Stack: ' + e.stack);
    return { success: false, message: 'Terjadi kesalahan pada server saat mengambil data dashboard: ' + e.message };
  }
}
