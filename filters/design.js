function(doc,req){
    if (doc._id == "_design/errorlog") 
        return true;
    else
        return false;
}