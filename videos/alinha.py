#!/usr/bin/env python3
"""Ouve o áudio de uma lição e anota em que segundo cada palavra é dita.

É o que deixa os lances e as setas do vídeo no ponto certo da fala, e também o que
escreve o rascunho de uma lição a partir de um áudio gravado (gera.js --rascunho).

Uso (quem chama é o videos/gera.js):  python3 videos/alinha.py audio.m4a saida.json
Precisa de:  pip install faster-whisper
O modelo é o "small" (rápido e bom o bastante); para trocar: XE_WHISPER=medium
"""
import json
import os
import subprocess
import sys

import numpy as np

try:
    from faster_whisper import WhisperModel
except ImportError:
    sys.exit("Falta o reconhecimento de fala. Instale com:  pip install faster-whisper")

# Vocabulário de aula de xadrez: ajuda o modelo a escrever "xeque", "e4", "roque" do jeito certo.
DICA = ("Aula de xadrez do Xadrez Express. O cavalo, o bispo, a torre, a dama, o rei e o peão. "
        "Xeque, xeque-mate, roque, garfo, cravada, promoção, en passant. As casas e4, d5, f3 e c6.")


def main():
    audio, saida = sys.argv[1], sys.argv[2]
    modelo = WhisperModel(os.environ.get("XE_WHISPER", "small"), device="cpu", compute_type="int8")
    # quem abre o áudio é o ffmpeg (lê qualquer formato: m4a do iPhone, ogg do WhatsApp...)
    bruto = subprocess.run(["ffmpeg", "-v", "error", "-i", audio, "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
                           check=True, capture_output=True).stdout
    som = np.frombuffer(bruto, dtype=np.float32)
    trechos, info = modelo.transcribe(som, language="pt", word_timestamps=True,
                                      initial_prompt=DICA, condition_on_previous_text=False)
    frases, palavras = [], []
    for trecho in trechos:
        frases.append(trecho.text.strip())
        for w in trecho.words or []:
            texto = w.word.strip()
            if texto:
                palavras.append({"p": texto, "ini": round(w.start, 3), "fim": round(w.end, 3)})
    with open(saida, "w", encoding="utf-8") as f:
        json.dump({"fonte": "whisper", "dur": info.duration, "frases": frases, "palavras": palavras},
                  f, ensure_ascii=False)


if __name__ == "__main__":
    main()
