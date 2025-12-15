import socket
import argparse
import sys
import os
import re        # good for matching things!
import uuid      # unique ID stuff
import json
import tempfile  # unique ID stuff
import time      # for timeouts
import traceback # helpful for debugging! Though you should probably pull this out before you submit
import threading


HOST = socket.gethostname()
PORT = 33920
mID = 1 #message ID
LINE_ENDING = "\r\n"
usersList = {}
sessionList = {}
messageList = {}

def create_response(status: int, headers: dict[str, str], body: bytes) -> bytes:
    response = f"HTTP/1.1 {status}{LINE_ENDING}"
    for key, value in headers.items():
        response += f"{key}: {value}{LINE_ENDING}"
    response += LINE_ENDING #one more to close off headers
    print(response)
    response = response.encode()
    
    if body and len(body) > 0:
        response += body
        
    return response
        
            
def get_file_contents(path) -> bytes:
    if not os.path.exists(path):
        return None
    
    f = open(path, "rb")    
    contents = f.read()
    f.close()
    return contents


def serve_SPA(sock,uri):
    body = get_file_contents("static" + uri)
    
    if body:
        resp = create_response(200, {"Content-Length": len(body)},body)
    else:
        resp = create_response(404, {}, None)

    sock.sendall(resp)
    
    
def handle_GetLogin(cookieList):
    if 'sessionID' in cookieList.keys(): #if there is a cookie with sessionID go to the next part 
        #check if it was valid
        if(cookieList["sessionID"] in sessionList):
            #log them in
            response = create_response(200,{},None)
        else:
            #not valid
            response = create_response(401,{},None)
    else:
        response = create_response(401,{},None)

    return response


def handle_getAllMessages(cookieList):
    
    sessionID = cookieList["sessionID"]
    if(sessionID in sessionList):
        body = json.dumps(messageList)
        body = body.encode()
        response = create_response(200,{"Content-Length": str(len(body))},body)
    else:
        response = create_response(401,{},None)
    return response


def handle_getFilteredMessages(cookieList,urisplitter):
    sessionID = cookieList["sessionID"]
    if(sessionID in sessionList):
        tempMessageList = {}
        try:
        #get the value sent over
                value = int(urisplitter[1])
                if value >= mID:
                    #print all 
                    body = json.dumps(messageList)
                    body = body.encode()
                else:
                    i = 1
                    tempMID = mID - 1    
                    while i <= value:

                        tempMessageList[str(tempMID)] = messageList[str(tempMID)]
                        tempMID = tempMID - 1
                        i = i + 1
                    body = json.dumps(tempMessageList)
                    body = body.encode()
                    
                response = create_response(200,{"Content-Length": str(len(body))},body)
                
        except Exception as e:
            response = create_response(500,{},None)
            return response
    else:
        response = create_response(401,{},None)
        
    return response


def handle_CreateLogin(body):
    user = {}
    username = ""
    pairs = body.split("&")
    for p in pairs:
        key, value = p.split("=", maxsplit = 1)
        user[key] = value
    if user["username"] in usersList:
        #do not add the user
        response = create_response(403,{},None)
    else:
        username = user["username"]
        usersList[username] = user
        response = create_response(201,{"Content-Length": "0"},None)
    return response   
    
def handle_PostLogin(body):
    UUID = uuid.uuid4()
    user = {}
    if body:
        # parse body
        pairs = body.split("&")
        for p in pairs:
            key, value = p.split("=", maxsplit = 1)
            user[key] = value
        username = user["username"]
            # IF USER EXISTS
        if username in usersList.keys():
        
            userFromList = usersList[username]#get the object in our userlist
            if userFromList["password"] == user["password"]:# IF PASSWORD IS RIGHT
                #log them in and pass a session cookie
                response = create_response(200,{"Set-Cookie": "sessionID="+str(UUID)+";"+"HttpOnly"+";Path=/","Content-Length": "0"},None)
                sessionList[str(UUID)] = userFromList # add user object with key being the sessionID
                
            else:# creds were applied but wrong password
                response = create_response(401,{},None)
        else:#userID was not in the list
            response = create_response(404,{},None)
    return response


def handle_PostMessage(cookieList,body):
    global mID 
    messageData = {}
    sessionID = cookieList["sessionID"]
    if(sessionID in sessionList):
    #grab the username
        session = sessionList[str(sessionID)]# grab the session object
        user=session["username"]#grab the username from the session object 
        messageData["username"] = user
        messageData["message"] = body
        messageData["mID"] = mID
        messageList[str(mID)] = messageData
        
        ###SEND THE WHOLE LIST
        body = json.dumps(messageList)
        body = body.encode()
        #increment messageID
        mID = mID + 1
        response = create_response(200,{"Content-Length": str(len(body))},body)
        
    else:
        print("something went wrong when finding the user who posted the message")
        response = create_response(401,{},None)
        
    return response


#handles all of our requests
def handle_request(sock):
    
  
   
    try:
        data = sock.recv(10024)# decode the data
        data = data.decode()
        req = data.split("\n")[0]
        method,uri,ver = req.split(" ")# split the first line for the request
        headerLines,body = data.split("\r\n\r\n")#split the body and headerlines
        headers = headerLines.split("\n")[1:]#all headers except the request line
        headersList = {} 
        urisplitter = uri.split("=") # this is for the query 
        for h in headers:
            k, v = h.split(":", maxsplit=1)
            headersList[k.strip()] = v.strip()
            
            #parse le cookies before handling the request
        cookieList = {}
        splitCookies = headersList["Cookie"].split("; ")
        for cookie in splitCookies:
            key,value = cookie.split("=",maxsplit=1)
            cookieList[key.strip()] = value.strip()
        
        if uri == "/":
           response = create_response(301,{"Location": "/SPA.html"},None)
           sock.sendall(response) #already in bytes so ready to send
        elif method == "GET":
            
            if uri=="/SPA.html" or uri=="/css/style.css" or uri=="/js/Main.js" or uri=="/images/MessageBoard.ico":
                
                serve_SPA(sock,uri)
                 
            elif uri == "/api/login":
                
               response = handle_GetLogin(cookieList)
               sock.sendall(response)
               
            elif uri == "/api/messages":
                response = handle_getAllMessages(cookieList)
                sock.sendall(response)
                
                
            elif urisplitter[0] == "/api/messages?last":
                response = handle_getFilteredMessages(cookieList,urisplitter)
                sock.sendall(response)
            else:
                sock.sendall(create_response(404,{},None))
                                

        elif method == "CREATE" and uri == "/api/login":
            response = handle_CreateLogin(body)
            sock.sendall(response)
                    
                    
        elif method == "POST" and uri =="/api/login":
            response = handle_PostLogin(body)
            sock.sendall(response)
                
                
        elif method == "DELETE" and uri == "/api/login":
            sessionID = cookieList["sessionID"]
            if(sessionID in sessionList):  
                sessionList.pop(str(sessionID))
                
            response = create_response(200,{"Message": "Logged out successfully"},None)
            sock.sendall(response)
            
        elif method == "POST" and uri == "/api/messages":
            response = handle_PostMessage(cookieList,body)
            sock.sendall(response)
                
    except Exception as e:
        print("Error handling request from", sock.getpeername(),"\n", e)
    
    finally:
        sock.shutdown(socket.SHUT_RDWR)
        print("closing socket")
        sock.close()#close it after the thread runs


with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((HOST,PORT))
    s.listen()
    print("Now hosting on "+ HOST+ " "+str(PORT))
    try:
        while True:
            try:
            
                # Accept new conn through listening sock
                newconn, addr = s.accept()
                print("Accepting connetion from", addr)
                thr = threading.Thread(target=handle_request, args=[newconn])
                thr.start()
            
               
            except OSError as e:
                print("Socket error:", e)
                newconn.shutdown(socket.SHUT_RDWR)
                newconn.close()
                s.shutdown(socket.SHUT_RDWR)
                s.close()
                
    except KeyboardInterrupt as KI:
        print ("\nKeyboard Inturrupt shutting down server")
        s.shutdown(socket.SHUT_RDWR)
        s.close()
            