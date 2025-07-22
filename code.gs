// code.gs (FINAL)

const ss = SpreadsheetApp.getActiveSpreadsheet();

// Fungsi untuk memvalidasi request menggunakan API Key
function isValidRequest(e) {
  const SCRIPT_API_KEY = PropertiesService.getScriptProperties().getProperty('API_KEY');
  
  // Pemeriksaan defensif untuk memastikan 'e' dan 'e.parameter' ada
  if (!e || !e.parameter) {
    Logger.log('Error: Event object or parameters are missing.');
    return false;
  }

  // Baca API key dari parameter URL
  const receivedKey = e.parameter.apiKey;

  Logger.log(`Received Key from URL: ${receivedKey} | Expected Key starts with: ${SCRIPT_API_KEY ? SCRIPT_API_KEY.substring(0, 4) + '...' : 'NOT SET'}`);

  return receivedKey === SCRIPT_API_KEY;
}

// --- Fungsi Utility ---
function sendJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// Fungsi doGet untuk menangani permintaan GET dari Netlify
function doGet(e) {
  if (!isValidRequest(e)) {
    return sendJSON({ success: false, message: 'Akses Ditolak: API Key tidak valid.' });
  }
  
  var action = e.parameter.action;
  var result = {};

  try {
    // Router untuk menentukan fungsi mana yang dipanggil berdasarkan parameter 'action'
    switch (action) {
      case "getDashboardTugasStatus":
        result = getDashboardTugasStatus(e.parameter.username);
        break;
      case "getMappingTugasForUser":
        result = getMappingTugasForUser(e.parameter.username);
        break;
      case "getBuktiDukung":
        result = getBuktiDukung(e.parameter.username, e.parameter.kodeHirarki);
        break;
      case "getLinkPendukung":
        result = getLinkPendukung();
        break;
      default:
        result = { success: false, message: "Aksi GET tidak valid" };
    }
  } catch (err) {
    result = { success: false, message: "Error di server: " + err.message };
  }
  
  return sendJSON(result);
}

// Fungsi doPost untuk menangani permintaan POST
function doPost(e) {
  // Selalu validasi request terlebih dahulu
  if (!isValidRequest(e)) {
    // Untuk debugging, kita kirim kembali kunci yang diterima
    const receivedKey = (e && e.parameter) ? e.parameter.apiKey : "Parameter not found";
    return sendJSON({ 
      success: false, 
      message: 'Akses Ditolak: API Key tidak valid.',
      debug_received_key: receivedKey 
    });
  }

  let payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return sendJSON({ success: false, message: 'Gagal mem-parsing data request.' });
  }
  
  const action = payload.action;

  // Router untuk menentukan fungsi mana yang dipanggil berdasarkan 'action' di body JSON
  switch (action) {
    case "login":
      result = login(payload.payload.username, payload.payload.password);
      break;
    case "saveBuktiDukung":
      result = saveBuktiDukung(payload.payload.username, payload.payload.kodeHirarki, payload.payload.nilai, payload.payload.jenis);
      break;
    case "setStatusPenilaian":
      result = setStatusPenilaian(payload.payload.username, payload.payload.kodeHirarki, payload.payload.role, payload.payload.status, payload.payload.catatan);
      break;
    default:
      result = { success: false, message: "Aksi POST tidak valid" };
  }

  return sendJSON(result);
}

// --- FUNGSI-FUNGSI LOGIKA BISNIS ANDA (TIDAK ADA PERUBAHAN DI SINI) ---
function login(username, password) {
  var sheet = ss.getSheetByName("Users");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == username && data[i][1] == password) {
      return { success: true, nama: data[i][2], pilar: data[i][3], role: data[i][4], username: username };
    }
  }
  return { success: false, message: "Username atau password salah!" };
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

function getMappingTugasForUser(username) {
  var mappingSheet = ss.getSheetByName("MappingTugas");
  var mapping = mappingSheet.getDataRange().getValues();
  var headers = mapping[0];
  var res = [];
  for (var i = 1; i < mapping.length; i++) {
    if (mapping[i][0] == username) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = mapping[i][j];
      }
      res.push(row);
    }
  }
  return res;
}

function getBuktiDukung(username, kodeHirarki) {
  var sheet = ss.getSheetByName("BuktiDukung");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == username && data[i][1] == kodeHirarki) {
      return { 
        nilai: data[i][2], 
        jenis: data[i][3],
        statusKetua: data[i][5] || "",
        catatanKetua: data[i][6] || "",
        statusAdmin: data[i][7] || "",
        catatanAdmin: data[i][8] || ""
      };
    }
  }
  return { nilai: "", jenis: "", statusKetua: "", catatanKetua: "", statusAdmin: "", catatanAdmin: "" };
}

function saveBuktiDukung(username, kodeHirarki, nilai, jenis) {
  var sheet = ss.getSheetByName("BuktiDukung");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == username && data[i][1] == kodeHirarki) {
      sheet.getRange(i+1, 3).setValue(nilai);
      sheet.getRange(i+1, 4).setValue(jenis);
      sheet.getRange(i+1, 5).setValue(new Date());
      return { success: true, message: "Bukti dukung diperbarui." };
    }
  }
  sheet.appendRow([username, kodeHirarki, nilai, jenis, new Date(), "", "", "", ""]);
  return { success: true, message: "Bukti dukung disimpan." };
}

function getDashboardTugasStatus(username) {
  var user = getUserInfo(username);
  if (!user || !user.username) return [];
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
  return hasil;
}

function getAllPilars() {
  var tugasSheet = ss.getSheetByName("MappingTugas");
  var data = tugasSheet.getDataRange().getValues();
  var pilars = {};
  for (var i = 1; i < data.length; i++) {
    pilars[data[i][1]] = true;
  }
  return Object.keys(pilars);
}

function setStatusPenilaian(username, kodeHirarki, role, status, catatan) {
  var sheet = ss.getSheetByName("BuktiDukung");
  var data = sheet.getDataRange().getValues();
  var colStatus = role === "admin" ? 7 : 5;
  var colCatatan = role === "admin" ? 8 : 6;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][1] && data[i][0] == username && data[i][1] == kodeHirarki) {
      sheet.getRange(i+1, colStatus+1).setValue(status);
      sheet.getRange(i+1, colCatatan+1).setValue(catatan);
      return { success: true, message: "Status berhasil diperbarui." };
    }
  }
  var row = [username, kodeHirarki, "", "", new Date(), "", "", "", ""];
  row[colStatus] = status;
  row[colCatatan] = catatan;
  sheet.appendRow(row);
  return { success: true, message: "Status berhasil ditambahkan." };
}

function getLinkPendukung() {
  var sheet = ss.getSheetByName("LinkPendukung");
  if (!sheet) return [];
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
  return result;
}
