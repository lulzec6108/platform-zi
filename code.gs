// code.gs (FINAL)

const ss = SpreadsheetApp.getActiveSpreadsheet();

// Fungsi untuk memeriksa apakah permintaan valid dengan membandingkan API Key
function isValidRequest(e) {
  const SCRIPT_PROPS = PropertiesService.getScriptProperties();
  const API_KEY = SCRIPT_PROPS.getProperty('API_KEY');
  
  // Ambil API key dari header permintaan
  const apiKeyFromHeader = e.headers['x-api-key'];

  if (apiKeyFromHeader && apiKeyFromHeader === API_KEY) {
    return true;
  }
  return false;
}

// Fungsi doGet untuk menangani permintaan GET dari Netlify
function doGet(e) {
  if (!isValidRequest(e)) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Akses Ditolak" }))
      .setMimeType(ContentService.MimeType.JSON);
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
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// Fungsi doPost untuk menangani permintaan POST
function doPost(e) {
  if (!isValidRequest(e)) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Akses Ditolak" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var result = {};
  try {
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;

    // Router untuk menentukan fungsi mana yang dipanggil berdasarkan 'action' di body JSON
    switch (action) {
      case "login":
        result = login(requestData.payload.username, requestData.payload.password);
        break;
      case "saveBuktiDukung":
        result = saveBuktiDukung(requestData.payload.username, requestData.payload.kodeHirarki, requestData.payload.nilai, requestData.payload.jenis);
        break;
      case "setStatusPenilaian":
       result = setStatusPenilaian(requestData.payload.username, requestData.payload.kodeHirarki, requestData.payload.role, requestData.payload.status, requestData.payload.catatan);
       break;
      default:
        result = { success: false, message: "Aksi POST tidak valid" };
    }
  } catch (err) {
    result = { success: false, message: "Error di server: " + err.message };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
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
