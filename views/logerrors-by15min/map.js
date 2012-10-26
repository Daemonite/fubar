function(doc){
    if (doc.logtype && doc.logtype == "error"){
		var interval = (Math.floor(parseInt(doc.datetimeorderable.slice(14,16)) / 15) * 15).toString();
		if (interval.length < 2) interval = "0"+interval; 
		
        emit([ doc.datetimeorderable.slice(0,13)+':'+interval.toString(), doc.application, doc.message ], 1);
    }
}