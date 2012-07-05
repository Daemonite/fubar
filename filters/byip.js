function(doc,req){
    if (doc.remoteaddress && doc.remoteaddress == req.query.ip) 
        return true;
    else
        return false;
}