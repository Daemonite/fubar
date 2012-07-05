function(newDoc, oldDoc, userCtx) {
    if (newDoc._id == "config" || newDoc._id == "_design/errorlog"){
		if (userCtx.roles.indexOf('_admin') == -1) {
			throw ({
				forbidden: 'The Fubar database can only be configured by admins'
			});
		}
	}
    else {
		if (newDoc.logtype === undefined) {
			throw ({
				forbidden: 'All documents must be log records'
			});
		}
	}
}