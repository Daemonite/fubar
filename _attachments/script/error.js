// Apache 2.0 J Chris Anderson 2011
$(function() {
		
	util.url.machine = util.url.machine || "all";
    
    function drawItems() {
		
		if (util.url.app && util.url.app.length) {
			var appname = util.applications[util.url.app] ? util.applications[util.url.app].name : util.url.app;
			document.title = util.url.error + " [" + appname + "]" + " - Fubar";
			$("#title").html(util.url.error + " [" + appname + "]");
		}
		else{
			document.title = util.url.error + " - Fubar";
			$("#title").html(util.url.error);
		}
	    
        var params = { 
			descending : true,
            update_seq : true
        };
		var logs = {};
		
		if (util.url.machine != "all") {
			params.include_docs = true; 
            params.startkey = [ util.url.error, util.url.app, util.url.machine, new Date() ];
            params.endkey = [ util.url.error, util.url.app, util.url.machine ];
			
	        logs = util.deferredView("logs-byappmachineanderror",params).pipe(function(data){
	            util.setupChanges(data.update_seq,{ filter:"byappanderror", application:util.url.app, error:util.url.error });
				util.onChanges(drawItems);
				
				return $.when(data.rows);
			})
		}
		else if (util.url.app && util.url.app.length){
			params.include_docs = true;
            params.startkey = [ util.url.error, util.url.app, new Date() ];
            params.endkey = [ util.url.error, util.url.app ];
			
	        logs = util.deferredView("logs-byappanderror",params).pipe(function(data){
	            util.setupChanges(data.update_seq,{ filter:"byappanderror", application:util.url.app, error:util.url.error });
				util.onChanges(drawItems);
				
				return $.when(data.rows);
			})
		}
		else{
			params.include_docs = true;
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
                    if (util.url.logid && util.url.logid == val.doc._id) val.doc.active = true; 
                    val.doc["type-"+val.doc.logtype] = true;
                    if (val.doc.event) val.doc["event-"+val.doc.event] = true;
                    val.doc["logseq"] = index + 1;
                    return val.doc;
                })
            })
        });
        
		if (util.url.app && util.url.app.length) {
			var machines = util.deferredView("machines",{ startkey:[util.url.app], endkey:[util.url.app+"_"], group:true }).pipe(function(data){
				
				var aResult = data.rows.map(function(val){ 
					return {
						name: val.key[1],
						active: (util.url.machine == val.key[1]),
						url: util.rootpath+"error.html?app="+util.url.app+"&machine="+encodeURIComponent(val.key[1])+"&error="+encodeURIComponent(util.url.error)
					}; 
				});
				
				aResult.unshift({
					name: "all",
					active: (util.url.machine == "all"),
					url: util.rootpath+"error.html?app="+util.url.app+"&error="+encodeURIComponent(util.url.error)
				});
				
				return $.when(aResult);
			});
		}
		else{
			var machines = $.when([]);
		}
		
        var page = $.when(logs,machines);
		page.done(function(logpage,machines){
            
			var templates = [ "logs", "fragment/pagination", "fragment/log-teaser", "log-teaser/default" ];
			
			for (var i = 0; i < logpage.logs.length; i++) templates.push("log-teaser/"+logpage.logs[i].logtype);
			
            $("#content").renderTemplate(templates, { 
                logs : logpage.logs, 
                includelogtype : true,
                paginate : 1,
				hasmachines: (machines.length > 0),
				machines: machines,
                applicationsummarypage : (util.url.app && util.url.app.length ? util.rootpath+"errors.html?app="+util.url.app+"&error="+encodeURIComponent(util.url.error) : ""),
                applicationlogpage : (util.url.app && util.url.app.length ? util.rootpath+"application.html?app="+util.url.app+"&logtype=error" : ""),
                logurl : function(){
                    return function(logid){
                        return util.rootpath+"log.html?id="+logid;
                    };
                }
            },function(){
                this.find(".time a").prettyDate();
            });
            
        });
        page.fail(util.renderError);
        
    };
    
    $(".log-table tbody tr").live("click",function(){
        window.location = $(this).find("a").attr("href");
    });
    
	util.onSessionReady(drawItems);
	
 });