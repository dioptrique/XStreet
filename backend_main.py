from flask import Flask, jsonify
from supabase import create_client, Client
from xrpl.wallet import generate_faucet_wallet
from xrpl.clients import JsonRpcClient
import traceback
from datetime import datetime
from flask import request
from dateutil import parser
import jwt
from functools import wraps
from flask_cors import CORS
from utils import create_escrow, get_user_wallet, get_product_wallet, get_product_price, get_product_price_stub, get_active_escrows


# Supabase connection
url = "https://wacicyiidaysfjdiaeim.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhY2ljeWlpZGF5c2ZqZGlhZWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0OTA5NDUsImV4cCI6MjA2MzA2Njk0NX0.6FpJppdFQNPkmd6dBxsShPbLtLYe0LAS2YrsN84LTUI"    # Your anon/public API key
supabase = create_client(url, key)

# Verify Supabase JWT Token from request header from frontend
def verify_jwt(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return {'error': 'No token provided'}, 401

        token = auth_header.split(' ')[1]
        try:
            # Verify the JWT token with Supabase
            user = supabase.auth.get_user(token)
            # Add the user to the request context
            request.user = user
            return f(*args, **kwargs)
        except Exception as e:
            print(e)
            return {'error': 'Invalid token'}, 401

    return decorated_function


# XRPL Testnet client
XRPL_TESTNET_URL = "https://s.altnet.rippletest.net:51234"
xrpl_client = JsonRpcClient(XRPL_TESTNET_URL)

# Flask app
app = Flask(__name__)

CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:8080"],  # Your frontend URL
        "methods": ["GET", "POST"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

@app.route("/")
def home():
    # Give a default message
    return jsonify({
        "status": "success",
        "message": "Welcome to the xStreet API"
    }), 200


@app.route("/create_wallet", methods=["POST"])
def create_wallet():
    try:
        # Create new testnet wallet
        wallet = generate_faucet_wallet(xrpl_client, debug=True)

        wallet_data = {
            "classic_address": wallet.classic_address,
            "public_key": wallet.public_key,
            "private_key": wallet.private_key,
            "seed": wallet.seed,
        }

        # Optional: store to Supabase if needed
        # supabase.table("wallets").insert(wallet_data).execute()

        return jsonify({
            "status": "success",
            "wallet": wallet_data
        }), 200

    except Exception as e:
        print("Wallet creation failed:", traceback.format_exc())
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 404


@app.route("/update_price", methods=["POST"])
def update_price():
    try:
        # 1. Fetch all products (wallets 1–9 implicitly assumed from context)
        products_resp = supabase.table("products").select("*").execute()
        products = products_resp.data

        if not products:
            return jsonify({"error": "No products found"}), 404

        result = {}

        for product in products:
            product_id = product['id']
            description = product.get("description", "")
            
            # 2. Fetch price history for this product
            history_resp = supabase.table("price_history") \
                .select("*") \
                .eq("product_id", product_id) \
                .execute()

            history = history_resp.data

            if history:
                # Sort history by timestamp ascending
                sorted_history = sorted(
                    history,
                    key=lambda x: parser.parse(x["timestamp"])
                )
                price_list = [entry["price"] for entry in sorted_history]
                timestamp_list = [entry["timestamp"] for entry in sorted_history]
            else:
                price_list = []
                timestamp_list = []

            # 3. Construct final dictionary
            result[str(product_id)] = {
                "price_history": price_list,
                "timestamp": timestamp_list,
                "description": description,
                "pricing_breakdown": {
                    "base_price": "stubbed",
                    "supply_modifier": "stubbed",
                    "demand_modifier": "stubbed",
                    "momentum": "stubbed"
                },
                "wallet_transaction_url": f"https://xrpl.org/tx/{product.get('classic_address', 'stubbed')}"
            }

        return jsonify(result), 200

    except Exception as e:
        print("Error in update_price:", traceback.format_exc())
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/stock", methods=["GET"])
def get_stock():
    return jsonify({"message": "Stock endpoint stub called"}), 200


@app.route("/wallet", methods=["GET"])
def wallet_info():
    return jsonify({"message": "Wallet info stub called"}), 200

@app.route("/buy/<product_id>", methods=["POST"])
@verify_jwt
def buy_product(product_id):
    user = request.user
    # Get product price
    product_price = get_product_price_stub(product_id)
    # Create escrow
    # get user wallet from supabase
    user_wallet = get_user_wallet(user.user.id)
    # Get product wallet from supabase
    product_wallet = get_product_wallet(product_id)
    response = create_escrow(product_price, user_wallet, product_wallet.classic_address)
    return jsonify(response), 200

@app.route("/orders_escrows", methods=["GET"])
@verify_jwt
def get_escrows():
    user = request.user
    user_wallet = get_user_wallet(user.user.id)
    # Get all escrows on user wallet from xrpl
    escrows = get_active_escrows(user_wallet.classic_address)
    print(escrows)
    return escrows, 200


@app.route("/escrow/<product_id>", methods=["POST"])
def finish_escrow(product_id):
    return jsonify({"message": f"Escrow initiated for product {product_id}"}), 200


@app.route("/order_delivery_confirmation/<purchase_id>", methods=["POST"])
def release_escrow(purchase_id):
    return jsonify({"message": f"Escrow released for purchase {purchase_id}"}), 200


@app.route("/order_delivery_failed/<purchase_id>", methods=["POST"])
def refund_escrow(purchase_id):
    return jsonify({"message": f"Escrow refunded to buyer for purchase {purchase_id}"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
