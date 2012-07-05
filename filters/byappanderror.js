function(doc,req){
    if (doc.application && doc.application == req.query.application && doc.message && doc.message == req.query.error) 
        return true;
    else
        return false;
}