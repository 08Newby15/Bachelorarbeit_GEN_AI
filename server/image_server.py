# Dient der Dokumentation und dem Testen des Bildgenerierungsservers
# Dieser Server läuft in einem eigenen Python-Prozess/Container und wird über den Namen "flux_py312" mit dem Befehl "flux_py312/Scripts/Activate.ps1" aktiviert.
# Der Server ist unter http://localhost:8123 erreichbar.
# Der Server wird mit beendet, wenn der Befehl "exit" eingegeben wird.
import torch
from diffusers import FluxPipeline
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import io

app = Flask(__name__)
CORS(app) 

print("Lade das Modell...")
try:
    pipe = FluxPipeline.from_pretrained("C:/Users/danie/Desktop/codes/flux1schnell", torch_dtype=torch.bfloat16)

    pipe.enable_sequential_cpu_offload()
    print("Modell geladen und Offloading aktiviert.")
except Exception as e:
    print(f"Fehler beim Laden des Modells: {e}")
    exit()

# --- API Endpunkt definiert ---
@app.route('/generate', methods=['POST'])
def generate_image():
    # 1. Empfängt den Prompt aus der JSON-Anfrage
    if not request.is_json:
        return jsonify({"error": "Anfrage muss JSON sein"}), 400

    data = request.get_json()
    prompt = data.get('prompt')

    if not prompt:
        return jsonify({"error": "Kein 'prompt' im JSON gefunden"}), 400

    print(f"Empfangener Prompt: {prompt}")

    try:
        # 2. Bildgenerierung
        print("Starte Bildgenerierung...")
        seed = data.get('seed', 0)
        num_inference_steps = data.get('steps', 4)

        generator = torch.Generator("cpu").manual_seed(seed)

        image = pipe(
            prompt=prompt,
            guidance_scale=0.0,
            output_type="pil",
            num_inference_steps=num_inference_steps,
            max_sequence_length=256,
            generator=generator
        ).images[0]
        print("Bild generiert.")

        # 3. Bild wird in Bytes umgewandelt und gesendet
        img_io = io.BytesIO()
        image.save(img_io, 'PNG')
        img_io.seek(0)

        print("Sende Bild zurück.")
        return send_file(img_io, mimetype='image/png')

    except Exception as e:
        print(f"Fehler während der Bildgenerierung: {e}")
        return jsonify({"error": f"Interner Serverfehler: {e}"}), 500

# --- Server starten ---
if __name__ == '__main__':
    print("Starte Flask Server auf Port 8123...")
    app.run(host='0.0.0.0', port=8123, debug=False)