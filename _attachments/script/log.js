// Apache 2.0 J Chris Anderson 2011
$(function() {
    
    function drawLog() {
        var log = util.deferredGet(util.url.id);
        
        log.done(function(doc){
            
            if (doc.url){
                var newurl = [];
                for (var k in doc.url)
                    newurl.push({ key:k, sortablekey:k.toLowerCase(), value:doc.url[k] });
                newurl.sort(function(a,b){ return a.sortablekey > b.sortablekey ? 1 : -1; });
                doc.url = newurl;
            }
            
            if (doc.stack){
                for (var i=0; i<doc.stack.length; i++)
                    doc.stack[i]["is-"+doc.stack[i].location] = true;
            }
            
            for (var k in doc){
                if (doc[k].constructor == Array) doc[k+"-exists"] = true;
            }
			
			doc.valarray = [];
			for (var k in doc){
				if (util.standardproperties.indexOf(k) == -1) doc.valarray.push({
					key: k,
					value: doc[k]
				});
			}
			
			doc["type-"+doc.logtype] = true;
            if (doc.event) doc["event-"+doc.event] = true;
            
            $("#content").renderTemplate([ "log-detail", "log-detail/default", "log-detail/"+doc.logtype ],{
                log : doc,
				applicationlogpage : util.rootpath+"application.html?app="+doc.application+"&logtype="+doc.logtype+"&logid="+doc._id,
				applicationsummarypage : util.rootpath+"errors.html?app="+doc.application+"&error="+encodeURIComponent(doc.message),
                sessionpage : util.rootpath+"session.html?session="+doc.sessionid+"&logid="+doc._id,
				ippage : util.rootpath+"ip.html?app="+doc.application+"&ip="+doc.remoteaddress+"&logid="+doc._id,
				undoubleback : function(){
					return function(data,render){
						return render(data).replace(/\\\\/g,"\\");
					}
				}
            });
            
        });
        log.fail(util.renderError);
        
    };
	
	util.onSessionReady(drawLog);
	
 });