import socket
import threading

HOST = '127.0.0.1'
PORT = 9999

def receive_messages(sock):
    while True:
        try:
            data = sock.recv(1024)
            if not data:
                print("[서버 연결 종료]")
                break
            print(data.decode('utf-8'))
        except:
            break

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect((HOST, PORT))

prompt = sock.recv(1024).decode('utf-8')
if prompt == "NICK":
    name = input("사용자 이름을 입력하세요: ").strip()
    sock.sendall(name.encode('utf-8'))

print(f"입장 완료. 종료하려면 '{name}bye' 입력")

t = threading.Thread(target=receive_messages, args=(sock,), daemon=True)
t.start()

while True:
    try:
        message = input()
        if not message:
            continue
        sock.sendall(message.encode('utf-8'))
        if message == f"{name}bye":
            break
    except:
        break

sock.close()
print("접속 종료")