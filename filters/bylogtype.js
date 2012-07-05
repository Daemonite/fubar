function(doc,req){
    var requestedtypes = (req.query.logtypes ? req.query.logtypes.split(",") : [ "*" ]);
	var requestedapp = (req.query.app ? req.query.app : "*")
    
    if (doc.logtype && (requestedtypes[0] == "*" || requestedtypes.indexOf(doc.logtype.toString()) > -1) &&
	doc.application &&
	(requestedapp == "*" || requestedapp == doc.application)) 
		return true;
	else
		return false;
}