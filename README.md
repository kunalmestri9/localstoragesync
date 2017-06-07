# Local Storage Sync
Sync your localstorage for subdomains.


Usage:
------
It's easy just give call to method `LocalStorageSync.init(options)` by passing options as an object of required parameters

### Example 
For Initialization of the script
```javascript
LocalStorageSync.init({
      mainDomain:"localhost.com",
      subdomains:["l.localhost.com","m.localhost.com"],
      isMainServerUpdationRequired:false
    });
```
After that you can save anything to the localstorage using `JSONStorage` instance.

```javascript
JSONStorage.saveObjectToModule(moduleName,key,object);
```
It will go to localstorage and will be propagated to subdomains.

## License
MIT
 
