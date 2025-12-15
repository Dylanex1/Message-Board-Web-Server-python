register_Status = false
const NOT_FOUND = 404
const OK = 200
const UNAUTHORIZED = 401
const CREATED = 201
const FORBIDDEN = 403

let interval

function messageRequest()
{

    let body = ""
    let XHR = new XMLHttpRequest()
    XHR.open("GET","/api/messages",true)
    XHR.withCredentials = true;
    XHR.send(body)


    XHR.onreadystatechange = () => 
    {
        if(XHR.status === OK && XHR.readyState === XHR.DONE)
        {
            body = XHR.response
            get_messages(body)
        }
        else if (XHR.status === UNAUTHORIZED && XHR.readyState === XHR.DONE)
        {
            showLogin()
        }
    }
}
function filterMessageRequest()
{
    
    let body = ""
    value = ""
    try 
    {
        value = document.getElementById("filterbox").value
        value = parseInt(value)
        if(isNaN(value)) throw error; // we only want to accept integers in the filter text box
        let XHR = new XMLHttpRequest()
        XHR.open("GET","/api/messages?last="+value,true)
        XHR.withCredentials = true;
        XHR.send(null)
        XHR.onreadystatechange = () => 
        {
            if(XHR.status === OK && XHR.readyState === XHR.DONE)
            {
                body = XHR.response
                get_messages(body)
                document.getElementById("Error text").hidden = true
            }
            else if (XHR.status === UNAUTHORIZED && XHR.readyState === XHR.DONE)
            {
                showLogin()
            }
        }
    } 
    catch (error) 
    {
        document.getElementById("Error text").innerHTML = "The filter Must be in integer format!!"
        document.getElementById("Error text").hidden = false
    }
   
}


function logged_in()
{
    document.getElementById("username box").hidden=true
    document.getElementById("password box").hidden=true
    document.getElementById("Login text").hidden=true
    document.getElementById("login button").hidden=true
    document.getElementById("Login header").innerHTML = "MessageBoard"
    document.getElementById("Register text").hidden=true
    document.getElementById("Register button").hidden=true
    document.getElementById("Logout button").hidden=false
    document.getElementById("Error text").hidden=true
    document.getElementById("MessageBoard").hidden=false
    document.getElementById("username").value = ""
    document.getElementById("password").value = ""
    document.getElementById("message").value = ""
    document.getElementById("filterbox").value = ""
    document.getElementById("getMessageDiv").hidden = false
    messageRequest()
    login_Staus = true
    interval = setInterval(messageRequest,5000)
}

function get_messages(body)
{
    let list = ""

    messageData = JSON.parse(body)
    console.log(messageData)//can access like an array how do you now get the length

    for(let i in messageData)
    {
        list += "MessageID: "+messageData[i].mID+ " Message: "+messageData[i].message+" Message sent by: "+messageData[i].username + "<br>"
    }
    document.getElementById("messagetext").innerHTML = list
}

function login_button()
{
    let xhttp = new XMLHttpRequest()
    //get the password and username
    password = document.getElementById("password").value
    username = document.getElementById("username").value

    xhttp.open("POST","/api/login",true)
    xhttp.withCredentials = true
    xhttp.setRequestHeader("Content-Type","application/x-www-form-urlencoded")
    let body = "username="+username+"&"+"password="+password//encode it properly
    xhttp.send(body)
        xhttp.onreadystatechange = () => {
             if (xhttp.status === OK && xhttp.readyState === xhttp.DONE)
            //hide the login page
            {
                logged_in()
            }
            else if((xhttp.status === NOT_FOUND || xhttp.status === UNAUTHORIZED) && xhttp.readyState === xhttp.DONE)
            {
                document.getElementById("Error text").hidden=false
                document.getElementById("Error text").innerHTML = "Username/password incorrect"
            }
        }
}

function register_Button()
{
    if(register_Status) // if we are on the reigsration page the register button will now attempt to register a user 
    {
        let body = ""
        //check to see if the user and pass are in the system already?
        password = document.getElementById("password").value
        username = document.getElementById("username").value
        let xhttp = new XMLHttpRequest()
        xhttp.open("CREATE", "/api/login",true) // create async HTTP request
        xhttp.setRequestHeader("Content-Type","application/x-www-form-urlencoded")
        body+="username="+username+"&"+"password="+password//encode it properly
        xhttp.send(body)
        
        //get the response and see if we need to prompt a user not added
        xhttp.onreadystatechange = () => {
            if(xhttp.status === CREATED && xhttp.readyState === xhttp.DONE)
            {
                showLogin()
                register_Status = false
              
            }
            else if (xhttp.status === FORBIDDEN && xhttp.readyState === xhttp.DONE)
            {
                document.getElementById("Error text").innerHTML= "Username is already taken"
                document.getElementById("Error text").hidden=false
            }
        
        }
    }
    else //when user hits the register on the log in screen perform this action change the register status to true for the next action with this button
    {
        document.getElementById("username").value=''
        document.getElementById("password").value=''
        document.getElementById("Login text").innerHTML = "Register here please"
        document.getElementById("login button").hidden=true
        document.getElementById("Register text").hidden=true
        document.getElementById("Error text").hidden=true
        register_Status = true
    }
   
    
}

function logout_Button()
{
    let body = ""
    let xhttp = new XMLHttpRequest()

    xhttp.open("DELETE", "/api/login",true)
    xhttp.send(body)
     xhttp.onreadystatechange = () => {
        if(xhttp.status === OK && xhttp.readyState === xhttp.DONE)
        {  
            document.getElementById("Login header").hidden=true
            document.getElementById("Logout button").hidden=true
            document.getElementById("Error text").hidden=true
            document.getElementById("MessageBoard").hidden=true
            document.getElementById("Login text").hidden=false
            document.getElementById("getMessageDiv").hidden = true
            document.getElementById("Login text").innerHTML= "Logged out successfully returning to login"
            
            // wait 3 seconds
            setTimeout(showLogin,3000)
        }
     }
}

function showLogin()
{
    document.getElementById("username box").hidden=false
    document.getElementById("password box").hidden=false
    document.getElementById("username").value = ''
    document.getElementById("password").value = ''
    document.getElementById("login button").hidden=false
    document.getElementById("Login header").hidden=false
    document.getElementById("Register text").hidden=false
    document.getElementById("Register button").hidden=false
    document.getElementById("Logout button").hidden=true
    document.getElementById("Login text").hidden=false
    document.getElementById("Login text").innerHTML= "Please log in and then you may use the service!"
    document.getElementById("Login header").innerHTML = "Welcome to MessageBoard!"
    document.getElementById("Error text").hidden=true
    document.getElementById("MessageBoard").hidden=true
    document.getElementById("getMessageDiv").hidden = true
    clearInterval(interval)
}

function submit_Message_Button()
{
    let body = ""
    let xhttp = new XMLHttpRequest()

    xhttp.open("POST", "/api/messages",true)
    xhttp.withCredentials = true;
    body += document.getElementById("message").value
    xhttp.send(body)
    xhttp.onreadystatechange = () => 
    {
        if(xhttp.status === OK && xhttp.readyState === xhttp.DONE)
        {
            //get the body back and process it properly
            body = xhttp.response
            messageData = JSON.parse(body)
            console.log(messageData)//can access like an array how do you now get the length
            // has to be sent as JSON so parse with a loop?
            let list = ""
            for(let i in messageData)
            {
                list += "MessageID: "+messageData[i].mID+ " Message: "+messageData[i].message+" Message sent by: "+messageData[i].username + "<br>"
            }
            //parse 
            //newpost = document.createElement("p")
            //newpost.innerHTML = "MessageID: "+messageData.mID+ " Message: "+messageData.message+" Message sent by: "+messageData.username
            document.getElementById("messagetext").innerHTML = list

        }
        else if (xhttp.status === UNAUTHORIZED && xhttp.readyState === xhttp.DONE)
        {
            showLogin()
        }
    }

}

// This is to run too see if there is a cookie
function getCookies()
{
    let XHR = new XMLHttpRequest()
    XHR.open("GET","/api/login",true)
    let body = ""
    XHR.send(body)
    XHR.onreadystatechange = () => 
    {
        if (XHR.status === OK && XHR.readyState === XHR.DONE)
        //hide the login page
        {
            logged_in()
        }
        else // if there was unauthorization
        {
            showLogin()
        }

    }
}

//MAIN CODE THAT GETS CALLED
getCookies()