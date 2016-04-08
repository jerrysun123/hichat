/**
 * Created by sunry on 2016/4/6.
 */

// //引入http模块
//var http=require('http'),
////创建一个服务器
//server = http.createServer(function(req,res){
//    res.writeHead(200,{
//        'Content-Type':'txt/plain'
//    });
//    res.write('hello world!');
//    res.end();
//}).listen(8080);
//
////监听端口8080
//console.log('server started');


//服务器及页面响应部分
var express=require('express'),
    app=express(),
    server=require('http').createServer(app),
    io=require('socket.io').listen(server),
    users=[]; //保存所有在线用户昵称
app.use('/', express.static(__dirname+ '/www')); //指定静态文件的位置
server.listen(8080);

//socket部分 connection回调函数(callback)
io.on('connection',function(socket){
    //接收并处理客户端发送的login事件
    socket.on('login',function(nickname){
        if(users.indexOf(nickname)> -1){
            socket.emit('nickExisted');
        }else{
            socket.userIndex=users.length;//用户昵称数量
            socket.nickname=nickname;
            users.push(nickname);//添加新昵称
            socket.emit('loginSuccess');//触发登录成功事件
            io.sockets.emit('system',nickname, users.length,'login'); //向所有连接到服务器的客户端发送当前登录用户的昵称(所有人都可以收到system该事件)服务器整个socket连接
        };
    });
    //断开连接的事件
    socket.on('disconnect',function(){
        //将断开连接的用户从users中删除
        users.splice(socket.userIndex,1);
        //通知自己以外的所有人(socket.broadcast.emit()则表示向除自己外的所有人发送该事件)
        socket.broadcast.emit('system',socket.nickname,users.length,'logout');
    });

    //接收postMsg事件，并将消息显示到页面
    socket.on('postMsg',function(msg){
        //将消息发送到除自己外的所有用户
        socket.broadcast.emit('newMsg',socket.nickname,msg);
    });

    //接收用户发来的图片
    socket.on('img',function(imgData){
        //通过newImg事件来分发到除自己外的所有用户
        socket.broadcast.emit('newImg',socket.nickname,imgData);
    });



});

