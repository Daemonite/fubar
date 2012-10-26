// Apache 2.0 J Chris Anderson 2011
$(function() {
    
	util.url.logtype = util.url.logtype || "error";
	util.url.machine = util.url.machine || "all";
	
    function drawItems() {
		var appname = util.applications[util.url.app] ? util.applications[util.url.app].name : util.url.app;
	    document.title = appname + " - Fubar";
	    $("#title").html(appname);
	    
        var logtypes = util.deferredView("log-types").pipe(function(data){
            return data.rows[0].value.sort().map(function(val){ return { name:val, active:(val==util.url.logtype) }; });
        });
        logtypes.fail(util.renderError);
        
        var prevkey = (util.url.prevkey ? JSON.parse(util.url.prevkey) : "");
        var thiskey = "";
        var nextkey = "";
        
        util.url.rows = (util.url.rows ? parseInt(util.url.rows) : 50);
        util.url.page = (util.url.page ? parseInt(util.url.page) : 1);
        
        var params = { 
			include_docs : true,
            // start key
            endkey : [ util.url.app, util.url.logtype ],
            descending:true, 
            limit:util.url.rows + 1, 
            update_seq:true 
        }
        if (util.url.startkey){
            thiskey = JSON.parse(util.url.startkey);
            params.startkey = thiskey.key;
            params.startkey_docid = thiskey.id;
            thiskey = util.url.startkey;
        }
        else {
            params.startkey = [ util.url.app, util.url.logtype, new Date() ];
        }
        
		if (util.url.machine != "all") {
			params.endkey = [ util.url.app, util.url.machine, util.url.logtype ];
			if (!util.url.startkey)
				params.startkey = [ util.url.app, util.url.machine, util.url.logtype, new Date() ];
			var logs = util.deferredView("logs-bymachineandtype", params);
		}
		else {
			var logs = util.deferredView("logs-bytype", params);
		}
		
		logs = logs.pipe(function(data){
			util.onChanges(drawItems);
			util.setupChanges(data.update_seq, {
				filter: "bylogtype",
				logtypes: util.url.logtype + ",abc",
				app: util.url.app
			});
			
			return $.when({
				// serialize the key for this page
				thiskey: (data.rows.length ? "&startkey=" + encodeURIComponent(JSON.stringify({
					id: data.rows[0].id,
					key: data.rows[0].key
				})) + "&page=" + util.url.page.toString() : ""),
				
				// serialize the key for the next page
				nextkey: (data.rows.length == util.url.rows + 1 ? "&startkey=" + encodeURIComponent(JSON.stringify({
					id: data.rows[50].id,
					key: data.rows[50].key
				})) + "&page=" + (util.url.page + 1).toString() : ""),
				
				logs: data.rows.map(function(val, index){
					if (util.url.logid && util.url.logid == val.doc._id) 
						val.doc.active = true;
					val.doc["type-" + val.doc.logtype] = true;
					if (val.doc.event) 
						val.doc["event-" + val.doc.event] = true;
					val.doc["logseq"] = (util.url.page - 1) * util.url.rows + index + 1;
					return val.doc;
				})
			})
		});
        
		machines = util.deferredView("machines",{ startkey:[util.url.app], endkey:[util.url.app+"_"], group:true }).pipe(function(data){
			var aResult = data.rows.map(function(val){ 
				return {
					name: val.key[1],
					active: (util.url.machine == val.key[1]),
					url: util.rootpath+"application.html?app="+util.url.app+"&logtype="+util.url.logtype+"&machine="+encodeURIComponent(val.key[1])
				}; 
			});
			
			aResult.unshift({
				name: "all",
				active: (util.url.machine == "all"),
				url: util.rootpath+"application.html?app="+util.url.app+"&logtype="+util.url.logtype
			});
			
			return $.when(aResult);
		});
			
        var page = $.when(logtypes,logs,machines);
        page.done(function(logtypes,logpage,machines){
			
			var templates = [ "logs", "fragment/pagination", "fragment/log-teaser", "log-teaser/default" ];
			
			for (var i = 0; i < logpage.logs.length; i++) templates.push("log-teaser/"+logpage.logs[0].logtype);
			
            $("#content").renderTemplate(templates, { 
                logs : logpage.logs.slice(0,50), 
                includelogtype : false,
                logtypes : logtypes, 
                application : {
                    name : util.url.app
                },
                paginate : 1,
				hasmachines: (machines.length > 0),
				machines: machines,
				applicationsummarypage : util.rootpath+"errors.html?app="+util.url.app+(util.url.machine != "all" ? "&machine="+encodeURIComponent(util.url.machine) : ""),
                nextpage : (logpage.nextkey.length ? util.rootpath+"application.html?app="+util.url.app+(util.url.machine != "all" ? "&machine="+encodeURIComponent(util.url.machine) : "")+"&logtype="+util.url.logtype+logpage.nextkey : ""),
                logtypeurl : function(){
                    return function(logtype){
                        return util.rootpath+"application.html?app="+util.url.app+(util.url.machine != "all" ? "&machine="+encodeURIComponent(util.url.machine) : "")+"&logtype="+logtype;
                    };
                },
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
	
	util.onSessionReady(drawItems);
    
    $(".log-table tbody tr").live("click",function(){
        window.location = $(this).find("a").attr("href");
    });
    
 });