/**
 * lss.js - LocalStorageSync
 *
 * Copyright (c) 2016, Laurus Information Technology Private Ltd.
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without 
 * modification, are permitted provided that the following conditions are met:
 *
 * - Redistributions of source code must retain the above copyright notice, 
 *   this list of conditions and the following disclaimer.
 * - Redistributions in binary form must reproduce the above copyright notice, 
 *   this list of conditions and the following disclaimer in the documentation 
 *   and/or other materials provided with the distribution.
 * - Neither the name of the Laurus Information Technology Private Ltd. nor the names of its contributors 
 *   may be used to endorse or promote products derived from this software 
 *   without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE 
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE 
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF 
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN 
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE 
 * POSSIBILITY OF SUCH DAMAGE.
 *
 * @module LocalStorageSync
 * @author kunal mestri <kunal@laurus-it.com>
 * @description Sync Your localstorage for multiple websites.
 *
 */



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
