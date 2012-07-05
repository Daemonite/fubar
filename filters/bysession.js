function(doc,req){
    if (doc.sessionid && doc.sessionid == req.query.sessionid) 
        return true;
    else
        return false;
}