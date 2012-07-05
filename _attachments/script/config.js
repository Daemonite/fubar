// Apache 2.0 J Chris Anderson 2011
$(function() {
    
    var replicatorDB = $.couch.db("_replicator");
    
    function drawConfig() {
        var params = { 
            startkey : [ util.url.session ],
            endkey : [ util.url.session, new Date() ],
            update_seq:true 
        }
        
        var logtypes = util.deferredView("log-types").pipe(function(data){
			var result = [];
			
			if (data.rows.length) {
				result = data.rows[0].value.sort().map(function(val){
					return {
						value: val,
						label: val
					};
				});
				result.unshift({
					value: "*",
					label: "All"
				});
			}
            
            return $.when(result);
        });
        
        var replicationjobs = util.deferredAll({ db:replicatorDB, resolve:true }).pipe(function(data){
            var jobs = data.filter(function(val){ return (val._replication_id && val.source && val.source == util.dbname); }).sort(function(a,b){ return (a.target < b.target ? 1 : -1); });;
            
            return $.when(jobs)
        });
        
		var dbs = util.deferredDBs().pipe(function(data){
			return $.when(data.filter(function(val){
				return (val.slice(0,1) != "_")
			}).map(function(val){
				return { name : val	}
			}));
		});
		
        var page = $.when(dbs,util.config,replicationjobs,logtypes);
        page.done(function(dbs,config,jobs,logtypes){
			
            for (var i=0; i<dbs.length; i++)
				dbs[i].active = (config.db == dbs[i].name);
			
            for (var i=0; i<jobs.length; i++){
                var alogtypes = (jobs[i].query_params && jobs[i].query_params.logtypes.length ? jobs[i].query_params.logtypes.split(",") : [ "*" ]);
                
                jobs[i].logtypes = [];
                for (var j=0; j<logtypes.length; j++){
                    jobs[i].logtypes.push({
                        value : logtypes[j].value,
                        label : logtypes[j].label,
                        active : (alogtypes.indexOf(logtypes[j].value) > -1)
                    });
                }
				
				for (var j=0; j<alogtypes.length; j++){
					if (jobs[i].logtypes.filter(function(val){ return (val.value==alogtypes[j]); }).length == 0)
						jobs[i].logtypes.push({ value:alogtypes[j], label:alogtypes[j], active:true, unlisted:true });
				};
            }
            
            $("#content").renderTemplate([ "config", "config/general", "config/replication", "config/installation", "replication/form", "replication/teaser" ], { 
				dbs : dbs,
                logtypes : logtypes,
                jobs : jobs
            },function(){
				$(".collapse").collapse();
			});
            
        });
        page.fail(util.renderError);
        
    };
    
	util.setupChanges(0);
	util.onSessionReady(drawConfig);
    
	$("a.general-update").live("click",function(){
		var newdbname = $("#log-db").val();
		
		util.config.done(function(config){
			var newdb = $.couch.db(newdbname), olddbname = config.db;
			
			var appdesign = util.deferredGet("_design/"+util.design,{ db:util.appdb });
			var logdesignget = util.deferredGet("_design/"+util.design,{ db:newdb });
			var logdesign = $.Deferred();
			logdesignget.done(function(doc){
				logdesign.resolve(doc);
			});
			logdesignget.fail(function(err){
				logdesign.resolve({ _id:"_design/errorlog" });
			});
	        var replicationjobs = util.deferredAll({ db:replicatorDB, resolve:true }).pipe(function(jobs){
				return $.when(
					jobs.filter(function(val){
						return (val.source && val.source == olddbname && val.filter && val.filter == "errorlog/bylogtype");
					})
				);
			});
	        
			var update = $.when(appdesign,logdesign,replicationjobs);
			update.done(function(appdesign,logdesign,jobs){
				
				var saves = [], complete = {};
				
				if (config.db != newdbname){
					// config update
					config.db = newdbname;
					saves.push(util.deferredSave(config,{ db:util.appdb }));
					
					// replication jobs update
					for (var i=0; i<jobs.length; i++){
						jobs[i].source = newdbname;
						saves.push(util.deferredSave(jobs[i], {
							db: replicatorDB
						}));
					}
				}
				
				// target db update
				var changed = false, designupdates = [ "filters", "language", "updates", "views", "document_update_validation" ];
				
				for (var i=0; i<designupdates.length; i++){
					if (!logdesign[designupdates[i]] || JSON.stringify(appdesign[designupdates[i]]) != JSON.stringify(logdesign[designupdates[i]])){
						changed = true;
						logdesign[designupdates[i]] = appdesign[designupdates[i]];
					}
				}
				
				if (changed){
					saves.push(util.deferredSave(logdesign,{ db:newdb }));
				}
				
				complete = $.when.apply($,saves);
				complete.done(function(){
					util.stopChanges();
					util.dbname = newdbname;
					util.db = newdb;
					if (util.sessionready) $(document).trigger("sessionReady");
				});
				util.renderError("To get changes from the new database you will need to reload any Fubar pages you have open.");
				
			});
			update.fail(util.renderError);
		});
		
		return false;
	});
	
    $("a.job-create").live("click",function(){
        var query_params = {}, query_params_array = [];
        var logtypes = $(this).parents("tr").first().find("[name=logtypes]").val() || [];
		
		if ($(this).parents("tr").first().find("input[name=logtypes]").val().length)
			logtypes.push($(this).parents("tr").first().find("input[name=logtypes]").val());
			
		if (logtypes.length == 0) logtypes.push("*");
		
        var newjob = {
            source : util.dbname,
            target : $(this).parents("tr").first().find("[name=target]").val(),
            create_target : ($(this).parents("tr").first().find("[name=create_target]:checked").length > 0),
            continuous : ($(this).parents("tr").first().find("[name=continuous]:checked").length > 0),
            filter : "errorlog/bylogtype",
            query_params : { logtypes : logtypes.join(",") }
        };
        
        var saveddoc = util.deferredSave(newjob,{ db:replicatorDB })
        
        saveddoc.done(drawConfig);
        saveddoc.fail(util.renderError);
        
        return false;
    });
    
    $("a.job-remove").live("click",function(){
        if (!confirm("Are you sure?")) return false;
        
        var doc = {
            _id : $(this).parents("tr").first().find("[name=id]").val(),
            _rev : $(this).parents("tr").first().find("[name=rev]").val()
        };
        
        removeddoc = util.deferredRemove(doc,{ db:replicatorDB });
        
        removeddoc.done(drawConfig);
        removeddoc.fail(util.renderError);
        
        return false;
    });
    
    $("a.job-change").live("click",function(){
        $(this).parents("tr").first().find(".job-display").hide();
        $(this).parents("tr").first().find(".job-edit").show();
        
        return false;
    });
    
    $("a.job-cancel").live("click",function(){
        $(this).parents("tr").first().find(".job-edit").hide();
        $(this).parents("tr").first().find(".job-display").show();
        
        return false;
    });
    
    $("a.job-save").live("click",function(){
        var jobupdate = {}, query_params_array = [], query_params = {};
        var logtypes = $(this).parents("tr").first().find("[name=logtypes]").val() || [];
		
		if ($(this).parents("tr").first().find("input[name=logtypes]").val().length)
			logtypes.push($(this).parents("tr").first().find("input[name=logtypes]").val());
			
		if (logtypes.length == 0) logtypes.push("*");
        
        jobupdate.target = $(this).parents("tr").first().find("[name=target]").val();
        jobupdate.create_target = ($(this).parents("tr").first().find("[name=create_target]:checked").length > 0);
        jobupdate.continuous = ($(this).parents("tr").first().find("[name=continuous]:checked").length > 0);
        jobupdate.filter = "errorlog/bylogtype";
        jobupdate.query_params = { logtypes : logtypes.join(",") };
        
		if ($(this).parents("tr").first().find("input[name=logtypes]").val().length)
			jobupdate.query_params.logtypes.push($(this).parents("tr").first().find("input[name=logtypes]").val());
			
		if (jobupdate.query_params.logtypes.length == 0) jobupdate.query_params.logtypes.push("*");
		
        var doc = util.deferredGet($(this).parents("tr").first().find("[name=id]").val(),{ db:replicatorDB }).pipe(function(doc){
            doc.target = jobupdate.target;
            doc.create_target = jobupdate.create_target;
            doc.continuous = jobupdate.continuous;
            doc.filter = jobupdate.filter;
            doc.query_params = jobupdate.query_params;
            
            return util.deferredSave(doc,{ db:replicatorDB });
        });
        
        doc.done(drawConfig);
        doc.fail(util.renderError);
        
        return false;
    });
});