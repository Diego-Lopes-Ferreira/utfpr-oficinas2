/* ===== ELEMENTOS ===== */
const modo_automatico_switch = document.querySelector("#automatico_switch");

const bomba_switch = document.querySelector("#bomba_switch");

const nivel_obj_btn_sub = document.querySelector("#nivel_obj_btn_sub");
const nivel_obj_input = document.querySelector("#nivel_obj_input");
const nivel_obj_btn_add = document.querySelector("#nivel_obj_btn_add");

const arquivo_label_caminho = document.querySelector("#arquivo_label_caminho");
const arquivo_caminho = document.querySelector("#arquivo_caminho");
const arquivo_btn_carregar = document.querySelector("#arquivo_btn_carregar");

const arquivo_senha = document.querySelector("#arquivo_senha");
const arquivo_btn_salvar = document.querySelector("#arquivo_btn_salvar");

const arduino_conn = document.querySelector("#arduino_conn");
const arduino_dcon = document.querySelector("#arduino_dcon");

const grafico_historico_ctx = document.getElementById('myChart');
const grafico_nivel_atual_ctx = document.getElementById('sys_level_real_value_chart');

/* ===== MODO AUTOMATICO ===== */
function callback_modo_automatico_switch(e) {
  if (e.target.checked) {
    serial_send_data('1'); // Liga
    bomba_switch.disabled = true;
  } else {
    serial_send_data('2'); // Desliga
    bomba_switch.disabled = false;
  }
}

/* ===== NIVEL OBJETIVO ===== */
function atualiza_nivel_objetivo(direction) {
  if (direction == "sobe") {
    serial_send_data('5'); // sobe
    nivel_obj_input.value = parseInt(nivel_obj_input.value) + 1;
    if (parseInt(nivel_obj_input.value) > 100) nivel_obj_input.value = 100;
  } else if (direction == "desce") {
    serial_send_data('6'); // desce
    nivel_obj_input.value = parseInt(nivel_obj_input.value) - 1;
    if (parseInt(nivel_obj_input.value) < 0) nivel_obj_input.value = 0;
  }
}

/* ===== BOMBAA ===== */
function callback_bomba_switch(e) {
  if (e.target.disabled) return;

  if (e.target.checked) {
    serial_send_data('4'); // Liga
  } else {
    serial_send_data('3'); // Desliga
  }
}

/* ===== GRAFICOS ===== */
var DADOS_HISTORICO = [];
for (let i = 0; i < 1; i++) { DADOS_HISTORICO.push({ x: String(i), y: 0 }); }

const dataset_1 = {
  label: 'Nivel do Tanque',
  data: DADOS_HISTORICO,
  borderWidth: 2
};
const chart_config = {
  type: 'line',
  data: { datasets: [dataset_1] },
  options: {
    plugins: { tooltip: { enabled: false } },
    scales: { y: { min: 0, max: 100 } }
  }
};
const chart1 = new Chart(grafico_historico_ctx, chart_config);
// Nivel atual
const dataset_atual = {
  label: 'Nivel do Tanque',
  data: [{ x: 'AGORA', y: 0 }],
  borderWidth: 2
};
const chart_config_real_level = {
  type: 'bar',
  data: { datasets: [dataset_atual] },
  options: {
    plugins: { tooltip: { enabled: false } },
    scales: { y: { min: 0, max: 100 } }
  }
};
const chart2 = new Chart(grafico_nivel_atual_ctx, chart_config_real_level);

function interpret_message(msg) {
  console.log(msg);
  if (!msg.startsWith("dist:")) { return; }

  msg = msg.replace("dist:", "");
  let nivel_tanque = parseInt(msg);
  DADOS_HISTORICO.push({
    x: String(DADOS_HISTORICO.length),
    y: nivel_tanque
  });
  console.log(DADOS_HISTORICO);
  chart1.data.datasets[0].data = DADOS_HISTORICO;
  chart1.update('none');
  chart1.update('none');

  chart2.data.datasets[0].data = [{ x: 'AGORA', y: nivel_tanque }];
  chart2.update('none');
  chart2.update('none');
}

/* ===== ARQUIVOS ===== */
// https://dev.to/raddevus/encrypt-data-with-aes256-complete-process-with-sample-javascript-4805
function criptografar(mensagem_normal) {
  let senha_hashed = sha256(arquivo_senha.value);
  mensagem = CryptoJS.AES.encrypt(mensagem_normal, senha_hashed);
  return mensagem.toString();
}

function descriptografar(texto_criptografado) {
  let senha_hashed = sha256(arquivo_senha.value);
  code = CryptoJS.AES.decrypt(texto_criptografado, senha_hashed);
  let mensagem = "";
  if (code.sigBytes < 0) {
    console.warn("descriptografar: Incorrect password");
  } else {
    mensagem = code.toString(CryptoJS.enc.Utf8);
  }
  return mensagem;
}

// https://stackoverflow.com/questions/65050679/javascript-a-simple-way-to-save-a-text-file
function envia_arquivo_para_usuario(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function callback_arquivo_btn_salvar() {
  let mensagem_normal = JSON.stringify(DADOS_HISTORICO);
  console.log(mensagem_normal);
  let mensagem_criptografada = criptografar(mensagem_normal);
  console.log(mensagem_criptografada);
  envia_arquivo_para_usuario("dados.txt", mensagem_criptografada);
}

const fr = new FileReader();
var conteudo_arquivo = "";
function callback_arquivo_caminho(e) {
  let filename = e.target.value.split("fakepath\\")[1];
  arquivo_label_caminho.textContent = filename;

  fr.onload = () => {
    let all_text = fr.result;
    conteudo_arquivo = all_text.split("\r\n")[0];
  };
  fr.readAsText(e.target.files[0]);
}

function callback_arquivo_btn_carregar() {
  let mensagem_criptografada = conteudo_arquivo;
  console.log(mensagem_criptografada);
  let mensagem_normal = descriptografar(mensagem_criptografada);
  console.log(mensagem_normal);
  DADOS_HISTORICO = JSON.parse(mensagem_normal);

  console.log(DADOS_HISTORICO);
  chart1.data.datasets[0].data = DADOS_HISTORICO;
  chart1.update('none');
  chart1.update('none');

  chart2.data.datasets[0].data = [{
    x: 'AGORA',
    y: DADOS_HISTORICO[DADOS_HISTORICO.length - 1].y
  }];
  chart2.update('none');
  chart2.update('none');
}

document.addEventListener('DOMContentLoaded', () => {
  arduino_conn.addEventListener("click", () => serial_start_connection(interpret_message));
  arduino_dcon.addEventListener("click", serial_stop_connection);

  modo_automatico_switch.addEventListener('click', callback_modo_automatico_switch);
  nivel_obj_input.value = 75;
  nivel_obj_btn_sub.addEventListener("click", () => atualiza_nivel_objetivo("desce"));
  nivel_obj_btn_add.addEventListener("click", () => atualiza_nivel_objetivo("sobe"));

  bomba_switch.disabled = true;
  bomba_switch.addEventListener("click", callback_bomba_switch);

  arquivo_btn_salvar.addEventListener('click', callback_arquivo_btn_salvar);
  arquivo_caminho.addEventListener("change", callback_arquivo_caminho);
  arquivo_btn_carregar.addEventListener('click', callback_arquivo_btn_carregar);
});
