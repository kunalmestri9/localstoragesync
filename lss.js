LocalStorageSync={
    ob:{
      mainDomain:"localhost.com",
      subdomains:["l.localhost.com","m.localhost.com"],
      isMainServerUpdationRequired:false
    },
    isSyncNeeded:function(){
      var ind=this.ob.subdomains.indexOf(document.domain);
      return (document.domain == this.ob.mainDomain ||  (  ind!=-1 && document.domain ==this.ob.subdomains[ind]));
    },
    sendMessageToParent:function(key,val,module){
        var sendAble={
          _key:key,
          _val:val,
          _domain:document.domain,
          _msgType:"_toAdd"
        };
        if(typeof(module)!="undefined"){
            sendAble._module=module;
        }
        if(typeof(val)=="undefined"){
            sendAble._msgType="_toremove";
        }
        document.getElementById("_ls_sync_mainDomain").contentWindow.postMessage(JSON.stringify(sendAble),"*");
    },
    propagateMessageToChilds:function(obj){
      for(var i=0;i<this.ob.subdomains.length;i++){
        if(obj._domain!=this.ob.subdomains[i]){
          document.getElementById("_ls_sync_"+this.ob.subdomains[i]).contentWindow.postMessage(JSON.stringify(obj),"*");
        }
      }
    },
    _performOpOnLocal:function(jsonRecived){
          if(typeof(jsonRecived._val)=="undefined"){
              JSONStorage.removeStringWithoutPropagation(jsonRecived._key);
          }else{
            if(typeof(jsonRecived._val)!="undefined" && typeof(jsonRecived._module)!="undefined"){
                JSONStorage.saveObjectToModuleWithoutPropagation(jsonRecived._module,jsonRecived._key,jsonRecived._val);
            }else{
                JSONStorage.setStringWithoutPropagation(jsonRecived._key,jsonRecived._val);
            }
          }
    },
    parentMessageRecived:function(jsonRecived){ 
      //First lets add this message to main server domain
      if(LocalStorageSync.ob.isMainServerUpdationRequired){
          this._performOpOnLocal(jsonRecived);
      }
      //Now need to propagate message to childrens
      LocalStorageSync.propagateMessageToChilds(jsonRecived);

    },
    childMessageRecived:function(jsonRecived){
        this._performOpOnLocal(jsonRecived);
    },
    init:function(){
        if(!this.isSyncNeeded())return;
        var that=this;
        //Giving frames some ears 
        window.addEventListener("message", function (event){
          console.log("Message Recived By:"+ document.domain);
          var jsonRecived=JSON.parse(event.data);
          if(document.domain == LocalStorageSync.ob.mainDomain){
              LocalStorageSync.parentMessageRecived(jsonRecived);
          }else if(LocalStorageSync.isSyncNeeded()){
              LocalStorageSync.childMessageRecived(jsonRecived);
          }
        }, false);

        if( (window.self !== window.top  &&  window.name!="_ls_sync_mainDomain" )) { console.log("Returning") ; return } ;
        
        //Append A Iframe in childs to contact parent.
        if(document.domain!=this.ob.mainDomain){
            var mainFrame = document.createElement('iframe');
            mainFrame.setAttribute('id', '_ls_sync_mainDomain');
            mainFrame.setAttribute('name', '_ls_sync_mainDomain');
            if(document.body!=null)document.body.appendChild(mainFrame);
            mainFrame.setAttribute('src',"http://"+this.ob.mainDomain+"/_blank.html"); //Here blank.html should also contain this file.
        }else{
            //Here we have create iframes for every subdomain.
            for(var i=0;i<this.ob.subdomains.length;i++){
              var mainFrame = document.createElement('iframe');
              mainFrame.setAttribute('id', '_ls_sync_'+this.ob.subdomains[i]);
              mainFrame.setAttribute('name', '_ls_sync_'+this.ob.subdomains[i]);
              if(document.body!=null)document.body.appendChild(mainFrame);
              mainFrame.setAttribute('src',"http://"+this.ob.subdomains[i]+"/_blank.html"); //Here blank.html should also contain this file.
            }
        }
        
    }
}

StorageManager = {
  insert: function(key, val) {
	    localStorage.setItem(key, JSON.stringify(val));
  },
  getObject: function(key) {
	 return localStorage.getItem(key);
  }
};

JSONStorage={
  saveObjectToModule:function(moduleName,key,val){
	   this.saveObjectToModuleWithoutPropagation(moduleName,key,val);
     if(LocalStorageSync.isSyncNeeded()){
        LocalStorageSync.sendMessageToParent(key,val,moduleName)
     }
  },
  saveObjectToModuleWithoutPropagation:function(moduleName,key,val){
    var keyF= moduleName + key;
    StorageManager.insert(keyF, val);
  },
  getObjectFromModule:function(moduleName,key){
  	 var keyF= moduleName + key;
  	 return JSON.parse(StorageManager.getObject(keyF));
  },
  setString:function(key,val){
	  this.setStringWithoutPropagation(key,val);
     if(LocalStorageSync.isSyncNeeded()){
        LocalStorageSync.sendMessageToParent(key,val);
     }
  },
  setStringWithoutPropagation:function(key,val){
    localStorage.setItem(key,val);
  },
  getString:function(key){
	  return localStorage.getItem(key);
  },
  removeString:function(key){
     if(LocalStorageSync.isSyncNeeded()){
        LocalStorageSync.sendMessageToParent(key);
     }
	   return this.removeStringWithoutPropagation(key)
  },
  removeStringWithoutPropagation:function(key){
    return localStorage.removeItem(key);
  }
};

LocalStorageSync.init();
