/**
 * Created by sunry on 2016/4/7.
 */
window.onload=function(){
    //实例并初始化hichat程序
    var hichat=new HiChat();
    hichat.init();
};


//定义hichat类
var HiChat=function(){
    this.socket=null;
}

//向原型添加业务方法
HiChat.prototype={
    init:function(){//初始化程序
        var that=this;
        //建立服务器的socket连接
        this.socket=io.connect();

        //监听socket的connect事件，此事件表示连接已经建立
        this.socket.on('connect',function(){
            //连接到服务器后，显示昵称输入框
            document.getElementById('info').textContent='get yourself a nickname:)';
            document.getElementById('nickWrapper').style.display='block';
            document.getElementById('nicknameInput').focus();
        });

        //判断昵称是否存在
        this.socket.on('nickExisted',function(){
            document.getElementById('info').textContent='!nickname is taken, choose aother pls'; //显示昵称被占用信息
        });

        //登录成功后
        this.socket.on('loginSuccess',function(){
            document.title='hichat |'+document.getElementById('nicknameInput').value;
            document.getElementById('loginWrapper').style.display='none'; //隐藏遮盖层显示聊天界面
            document.getElementById('messageInput').focus();//让消息输入框获得焦点
        });
        //接收system事件
        this.socket.on('system',function(nickname,userCount,type){

            var msg=nickname+(type == 'login' ? ' joined':' left');

            //指定系统显示消息为红色
            that._displayNewMsg('system',msg,'red');
            document.getElementById('status').textContent=userCount+(userCount>1?'users':'user')+'online';
        });

        //昵称设置的确定按钮
        document.getElementById('loginBtn').addEventListener('click',function(){
            var nickName=document.getElementById('nicknameInput').value;
            //检查输入框是否为空
            if(nickName.trim().length!=0){
                //不为空则发起一个login事件并将输入的昵称发送到服务器
                that.socket.emit('login',nickName);
            }else{
                //否则输入框获得焦点
                document.getElementById('nicknameInput').focus()
            };
        },false);


        //监听聊天发送click事件
        document.getElementById('sendBtn').addEventListener('click',function(){
            var messageInput=document.getElementById('messageInput'),
                msg=messageInput.value,
                //获取颜色值
                color=document.getElementById('colorStyle').value;
            messageInput.value='';
            messageInput.focus();
            if(msg.trim().length!=0){
                that.socket.emit('postMsg',msg,color); //把信息发送给服务器
                that._displayNewMsg('me',msg,color);  //把自己的消息显示到自己的窗口中
            };
        },false);


        //接收服务器发送的newMsg事件，并将聊天消息显示到页面
        this.socket.on('newMsg',function(user,msg,color){
            that._displayNewMsg(user,msg,color);
        })

        //监听图片按钮的change事件，一旦用户选择了图片，便显示到自己的屏幕上同时读取为文本发送到服务器
        document.getElementById('sendImage').addEventListener('change',function(){
            //检查是否有文件被选中
            if(this.files.length!=0){
                //获取文件并用fileReader进行读取
                var file=this.files[0],
                    reader=new FileReader();
                if(!reader){
                    that._displayNewMsg('system','你的浏览器不支持文件读写器','red');
                    this.value='';
                    return;
                };
                reader.onload=function(e){
                    //读取成功，显示到页面并发送到服务器
                    this.value='';
                    that.socket.emit('img', e.target.result);//e.target.result目标DOM元素（img图片）结果
                    that._displayImage('me', e.target.result);
                };
                reader.readAsDataURL(file);
            };
        },false);

        //接收显示图片
        this.socket.on('newImg',function(user,img){
            that._displayImage(user,img);
        });


        this._initialEmoji();
        document.getElementById('emoji').addEventListener('click',function(e){
            var emojiwrapper=document.getElementById('emojiWrapper');
            emojiwrapper.style.display='block';
            e.stopPropagation();//终止事件在传播过程的捕获、目标处理或起泡阶段进一步传播。调用该方法后，该节点上处理该事件的处理程序将被调用，事件不再被分派到其他节点。
        },false);
        document.body.addEventListener('click',function(e){
            var emojiwrapper=document.getElementById('emojiWrapper');
            if(e.target != emojiwrapper){//如果目标对象不等于#emojiWrapper
                emojiwrapper.style.display='none';//隐藏它
            };
        });

        //表情被选中后，获取被选中的表情，转换为相应代码插入到消息框中
        document.getElementById('emojiWrapper').addEventListener('click',function(e){
            //获取被点击表情
            var target= e.target;
            if(target.nodeName.toLowerCase()=='img'){
                var messageInput=document.getElementById('messageInput');
                messageInput.focus();
                messageInput.value=messageInput.value+'[emoji:'+ target.title + ']';
            };
        },false);


        //回车键登录及发送消息
        document.getElementById('nicknameInput').addEventListener('keyup',function(e){
            if(e.keyCode == 13){
                var nickName=document.getElementById('nicknameInput').value;
                if(nickName.trim().length!=0){
                    that.socket.emit('login',nickName);
                };
            };
        },false);
        document.getElementById('messageInput').addEventListener('keyup',function(e){
            var messageInput=document.getElementById('messageInput'),
                msg=messageInput.value,
                color=document.getElementById('colorStyle').value;
            if(e.keyCode == 13 && msg.trim().length != 0){
                messageInput.value='';
                that.socket.emit('postMsg',msg,color);
                that._displayNewMsg('me',msg,color);
            };
        },false);


    },

    //将消息显示到页面的函数
    _displayNewMsg:function(user,msg,color){//3个参数表示：消息来源，信息，颜色
        var container=document.getElementById('historyMsg'),
            msgToDisplay=document.createElement('p'),//创建标签名为‘p’的节点
            date=new Date().toTimeString().substr(0,8),
            //将消息中的表情转换为图片
            msg = this._showEmoji(msg);
        msgToDisplay.style.color=color||"#000";
        msgToDisplay.innerHTML=user+'<span class="timespan">('+ date +'):</span>'+msg;
        container.appendChild(msgToDisplay);
        container.scrollTop=container.scrollHeight;
    },

    //将图片显示在自己的屏幕同时向服务器发送了一个img事件
    _displayImage:function(user,imgData,color){
        var container=document.getElementById('historyMsg'),
            msgToDisplay=document.createElement('p'),
            date=new Date().toTimeString().substr(0,8);
        msgToDisplay.style.color=color||"#000";
        msgToDisplay.innerHTML=
            user+'<span class="timespan">('+ date +'):</span> <br />'+ '<a href="'+ imgData +'"target="_blank"><img src="'+ imgData +'"/></a>';
        container.appendChild(msgToDisplay);
        container.scrollTop=container.scrollHeight;
    },

    //初始化所有表情
    _initialEmoji:function(){
        var emojiContainer=document.getElementById('emojiWrapper'),
            docFragment=document.createDocumentFragment();//创建文档碎片节点
        for(var i=40;i>0;i--){
            var emojiItem=document.createElement('img');
            emojiItem.src='../content/emoji/'+ i + '.gif';
            emojiItem.title=i;
            docFragment.appendChild(emojiItem);
        };
        emojiContainer.appendChild(docFragment);
    },

    //显示表情
    _showEmoji:function(msg){
        var match,result=msg,
            reg=/\[emoji:\d+\]/g,
            emojiIndex,
            totalEmojijiNum=document.getElementById('emojiWrapper').children.length;
        while(match=reg.exec(msg)){
            emojiIndex=match[0].slice(7,-1);
            if(emojiIndex>totalEmojijiNum){
                result=result.replace(match[0],'[X]');
            }else{
                result=result.replace(match[0],'<img class="emoji" src="../content/emoji/' + emojiIndex +'.gif " />');
            };
        };
        return result;
    }


};



