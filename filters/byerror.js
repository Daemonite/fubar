function(doc,req){
    if (doc.message && doc.message == req.query.error) 
        return true;
    else
        return false;
}