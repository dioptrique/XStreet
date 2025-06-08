from utils import create_escrow, finish_escrow, get_user_wallet, get_product_wallet, get_active_escrows
import time

response = create_escrow(0.001)
print(response)
#time.sleep(1)
#finish_escrow(response["sequence"])

#get_active_escrows()