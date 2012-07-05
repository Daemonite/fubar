// Apache 2.0 J Chris Anderson 2011
$(function() {
    
	if (util.url.app && util.url.app.length) {
		document.title = util.url.error + " [" + util.url.app + "]" + " - Fubar";
		$("#title").html(util.url.error + " [" + util.url.app + "]");
	}
	else{
		document.title = util.url.error + " - Fubar";
		$("#title").html(util.url.error);
	}
    
    function drawItems() {
		
        var params = { 
			descending : true,
            update_seq : true
        };
		var logs = {};
		
		if (util.url.app && util.url.app.length){
            params.startkey = [ util.url.error, util.url.app, new Date() ];
            params.endkey = [ util.url.error, util.url.app ];
			
	        logs = util.deferredView("logs-byappanderror",params).pipe(function(data){
	            util.setupChanges(data.update_seq,{ filter:"byappanderror", application:util.url.app, error:util.url.error });
				util.onChanges(drawItems);
				
				return $.when(data.rows);
			})
		}
		else{
            params.startkey = [ util.url.error, new Date() ];
            params.endkey = [ util.url.error ];
			
	        logs = util.deferredView("logs-byerror",params).pipe(function(data){
	            util.setupChanges(data.update_seq,{ filter:"byerror", error:util.url.error });
				util.onChanges(drawItems);
				
				return $.when(data.rows);
			})
		}
        
        logs = logs.pipe(function(data){
            return $.when({
                logs : data.map(function(val,index){ 
                    if (util.url.logid && util.url.logid == val.value._id) val.value.active = true; 
                    val.value["type-"+val.value.logtype] = true;
                    if (val.value.event) val.value["event-"+val.value.event] = true;
                    val.value["logseq"] = index + 1;
                    return val.value;
                })
            })
        });
        
        logs.done(function(logpage){
            
			var templates = [ "logs", "fragment/pagination", "fragment/log-teaser", "log-teaser/default" ];
			
			for (var i = 0; i < logpage.logs.length; i++) templates.push("log-teaser/"+logpage.logs[i].logtype);
			
            $("#content").renderTemplate(templates, { 
                logs : logpage.logs, 
                includelogtype : true,
                paginate : 1,
                applicationsummarypage : util.rootpath+"errors.html?app="+logpage.logs[0].application+"&error="+encodeURIComponent(util.url.error),
                applicationlogpage : util.rootpath+"application.html?app="+logpage.logs[0].application+"&logtype=error",
                logurl : function(){
                    return function(logid){
                        return util.rootpath+"log.html?id="+logid;
                    };
                }
            },function(){
                this.find(".time a").prettyDate();
            });
            
        });
        logs.fail(util.renderError);
        
    };
    
    $(".log-table tbody tr").live("click",function(){
        window.location = $(this).find("a").attr("href");
    });
    
	util.onSessionReady(drawItems);
	
 });