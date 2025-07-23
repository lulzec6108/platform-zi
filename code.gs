// code.gs (REVISED & SECURED)

const ss = SpreadsheetApp.getActiveSpreadsheet();
const SCRIPT_API_KEY = PropertiesService.getScriptProperties().getProperty('API_KEY');

// --- Fungsi Utility ---
function sendJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// --- Handlers Utama ---
function doGet(e) {
  // Validasi untuk GET: API Key harus ada di parameter URL
  if (!e || !e.parameter || e.parameter.apiKey !== SCRIPT_API_KEY) {
    return sendJSON({ success: false, message: 'Akses Ditolak: API Key tidak valid atau tidak ada.' });
  }

  const action = e.parameter.action;
  const payload = e.parameter;
  let result;

  try {
    switch (action) {
      case 'getDashboardTugasStatus':
        result = handleGetDashboardTugasStatus(payload);
        break;
      case 'getMappingTugasForUser':
        result = handleGetMappingTugasForUser(payload);
        break;
      case 'getBuktiDukung':
        result = handleGetBuktiDukung(payload);
        break;
      case 'getLinkPendukung':
        result = handleGetLinkPendukung();
        break;
      default:
        result = { success: false, message: 'Aksi GET tidak valid.' };
    }
  } catch (err) {
    Logger.log(`Error in doGet action '${action}': ${err.toString()}`);
    result = { success: false, message: `Terjadi kesalahan server pada aksi: ${action}` };
  }
  return sendJSON(result);
}

function doPost(e) {
  let requestData;
  try {
    requestData = JSON.parse(e.postData.contents);
  } catch (err) {
    return sendJSON({ success: false, message: 'Gagal mem-parsing data request.' });
  }

  // Validasi untuk POST: API Key harus ada di body request
  if (!requestData.apiKey || requestData.apiKey !== SCRIPT_API_KEY) {
    return sendJSON({ success: false, message: 'Akses Ditolak: API Key tidak valid atau tidak ada.' });
  }

  const action = requestData.action;
  const payload = requestData.payload;
  let result;

  try {
    switch (action) {
      case 'login':
        result = handleLogin(payload);
        break;
      case 'saveBuktiDukung':
        result = handleSaveBuktiDukung(payload);
        break;
      case 'setStatusPenilaian':
        result = handleSetStatusPenilaian(payload);
        break;
      default:
        result = { success: false, message: 'Aksi POST tidak valid.' };
    }
  } catch (err) {
    Logger.log(`Error in doPost action '${action}': ${err.toString()}`);
    result = { success: false, message: `Terjadi kesalahan server pada aksi: ${action}` };
  }
  return sendJSON(result);
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
  return { success: true, data: res };
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

function handleGetLinkPendukung() {
  var sheet = ss.getSheetByName("LinkPendukung");
  if (!sheet) return { success: true, data: [] };
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
  return { success: true, data: result };
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
  var sheet = ss.getSheetByName("BuktiDukung");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == payload.username && data[i][1] == payload.kodeHirarki) {
      sheet.getRange(i+1, 3).setValue(payload.nilai);
      sheet.getRange(i+1, 4).setValue(payload.jenis);
      sheet.getRange(i+1, 5).setValue(new Date());
      return { success: true, message: "Bukti dukung diperbarui." };
    }
  }
  sheet.appendRow([payload.username, payload.kodeHirarki, payload.nilai, payload.jenis, new Date(), "", "", "", ""]);
  return { success: true, message: "Bukti dukung disimpan." };
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
