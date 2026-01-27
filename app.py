from flask import Flask, render_template, jsonify, request
import json

app = Flask(__name__)

def load_json(path):
    with open(path, "r") as f:
        return json.load(f)

def save_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/load")
def api_load():
    character = load_json("character.json")
    state = load_json("state.json")

    cls = None
    if "class" in character:
        cls = load_json(f"rules/classes/{character['class']}.json")

    race = None
    if "race" in character:
        race = load_json(f"rules/races/{character['race']}.json")

    background = None
    if "background" in character:
        background = load_json(f"rules/backgrounds/{character['background']}.json")

    return jsonify({
        "character": character,
        "state": state,
        "cls": cls,
        "race": race,
        "background": background
    })

@app.route("/api/save_state", methods=["POST"])
def api_save_state():
    save_json("state.json", request.json)
    return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
