function(doc,req){
    if (doc.application && doc.application == req.query.application) 
        return true;
    else
        return false;
}