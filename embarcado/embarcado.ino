/*
 * ControladorNivel.ino
 * Verifica o nivel utilizando um HC-SR04 e um sensor boia
 * Aciona a bomba conforme o nivel objetivo configurado pelo usuario
 * Modo "automatico" e "manual" (usuario consegue ligar e desligar a bomba remotamente)
 */
#include <NewPing.h>

// DEFINICOES
#define ALTURA_TANQUE_MM 125
#define SENSOR_DIST_TX 8  // branco
#define SENSOR_DIST_RX 9  // azul
#define SENSOR_LIMITE 7   // verde
#define ATUADOR_BOMBA 6   // amarelo

// VARIAVEIS GLOBAIS
uint8_t VALOR_NIVEL_100 = 0;
unsigned long ultimo_envio_de_mensagem;
uint8_t MODO_AUTOMATICO = 0;
uint8_t NIVEL_LIMITE_MAXIMO = 95;
uint8_t NIVEL_LIMITE_MINIMO = 5;
uint8_t NIVEL_OBJETIVO = 75;

NewPing sensor_ultrasonico(SENSOR_DIST_TX,  // Pino trigger
                           SENSOR_DIST_RX,  // Pino echo
                           12);             // Maxima distancia em cm


// PROTOTIPOS
void setup();
void loop();
void controlador_nivel_tanque();
void verifica_mensagem_recebida_serial();
void atualizacao_do_valor_do_nivel();

// IMPLEMENTACOES
void setup() {
    Serial.begin(9600);
    ultimo_envio_de_mensagem = millis();
}

void loop() {
    verifica_mensagem_recebida_serial();
    if (millis() - ultimo_envio_de_mensagem > 1000) {
        atualizacao_do_valor_do_nivel();
        Serial.print("dist:");
        Serial.println(VALOR_NIVEL_100);
        ultimo_envio_de_mensagem = millis();
    }
    controlador_nivel_tanque();
}

void controlador_nivel_tanque() {
    if (digitalRead(SENSOR_LIMITE) == 0) {
        digitalWrite(ATUADOR_BOMBA, 0);
        return;
    }

    if (MODO_AUTOMATICO == 1) {
        if (VALOR_NIVEL_100 > NIVEL_LIMITE_MAXIMO) {
            digitalWrite(ATUADOR_BOMBA, 0);
        } else if (VALOR_NIVEL_100 > NIVEL_LIMITE_MINIMO) {
            if (VALOR_NIVEL_100 > NIVEL_OBJETIVO) {
                digitalWrite(ATUADOR_BOMBA, 0);
            }
            if (VALOR_NIVEL_100 < NIVEL_OBJETIVO) {
                digitalWrite(ATUADOR_BOMBA, 1);
            }
        } else {
            digitalWrite(ATUADOR_BOMBA, 1);
        }
    }
}

void verifica_mensagem_recebida_serial() {
    char byte_lido;
    while (Serial.available() > 0) {
        byte_lido = Serial.read();
        // Serial.print(byte_lido);  // echo

        // Sempre verifica se foi alterado o modo de funcionamento
        if (byte_lido == '1') {
            MODO_AUTOMATICO = 1;
            Serial.println("Modo automatico ligado");
        } else if (byte_lido == '2') {
            MODO_AUTOMATICO = 0;
            Serial.println("Modo automatico desligado");
        } else if (byte_lido == '5') {
            NIVEL_OBJETIVO++;
            if (NIVEL_OBJETIVO > 100)
                NIVEL_OBJETIVO = 100;
            Serial.print("Novo nivel: ");
            Serial.println(NIVEL_OBJETIVO);
        } else if (byte_lido == '6') {
            NIVEL_OBJETIVO--;
            if (NIVEL_OBJETIVO < 0)
                NIVEL_OBJETIVO = 0;
            Serial.print("Novo nivel: ");
            Serial.println(NIVEL_OBJETIVO);
        }

        // Se nao estiver no modo automatico, faz as acoes do usuario
        if (MODO_AUTOMATICO == 0) {
            if (byte_lido == '3') {
                digitalWrite(ATUADOR_BOMBA, 0);
                Serial.println("Bomba desligada");
            } else if (byte_lido == '4') {
                digitalWrite(ATUADOR_BOMBA, 1);
                Serial.println("Bomba ligada");
            }
        }
    }
}

void atualizacao_do_valor_do_nivel() {
    unsigned long leitura_us;
    unsigned int leitura_cm;

    leitura_us = sensor_ultrasonico.ping();
    leitura_cm = sensor_ultrasonico.convert_cm(leitura_us);
    leitura_cm = 12 - leitura_cm;

    VALOR_NIVEL_100 = (leitura_cm * 100) / 12;
}
