// BACKUP: Dense view section before changes
// This is the working dense view implementation that shows procedure category labels

) : isDenseView ? (
  <div className="dense-list-container space-y-1">
    {surgicalHistory.map((surgery) => {
      // DENSE VIEW: Create concise surgical procedure abbreviations
      const getProcedureAbbreviation = (procedureName: string): string => {
        const procedure = procedureName.toLowerCase();
        
        // Common surgical procedure abbreviations
        if (procedure.includes('appendectomy')) return 'Appy';
        if (procedure.includes('cholecystectomy')) return 'Chole';
        if (procedure.includes('colectomy')) return 'Colect';
        if (procedure.includes('hysterectomy')) return 'Hyst';
        if (procedure.includes('arthroscopy')) return 'Scope';
        if (procedure.includes('laparoscopy')) return 'Lap';
        if (procedure.includes('vertebroplasty')) return 'VP';
        if (procedure.includes('angioplasty')) return 'Angio';
        if (procedure.includes('bypass')) return 'Bypass';
        if (procedure.includes('replacement')) return 'Replacement';
        if (procedure.includes('repair')) return 'Repair';
        if (procedure.includes('resection')) return 'Resect';
        if (procedure.includes('transplant')) return 'Transplant';
        if (procedure.includes('mastectomy')) return 'Mastect';
        if (procedure.includes('prostatectomy')) return 'Prostatect';
        if (procedure.includes('tonsillectomy')) return 'T&A';
        if (procedure.includes('adenoidectomy')) return 'T&A';
        if (procedure.includes('cataract')) return 'Cataract';
        if (procedure.includes('hernia')) return 'Hernia';
        
        // Fallback: First significant word + year if available
        const words = procedureName.split(' ').filter(word => 
          word.length > 3 && !['surgery', 'procedure', 'operation'].includes(word.toLowerCase())
        );
        return words[0] || procedureName.substring(0, 8);
      };

      const procedureAbbrev = getProcedureAbbreviation(surgery.procedureName);
      const dateDisplay = surgery.procedureDate ? 
        format(parseISO(surgery.procedureDate), 'MMM yy') : 'Unknown';
      
      return (
        <div key={surgery.id} className="dense-list-item flex items-center justify-between py-1.5 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-sm transition-colors">
          <div className="flex items-center space-x-3 flex-1">
            {/* Procedure abbreviation label */}
            <div className="dense-list-label text-red-600 dark:text-red-400 text-xs font-medium min-w-[60px]">
              {procedureAbbrev}
            </div>
            
            {/* Main content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {surgery.procedureName}
                </span>
                {surgery.cptCode && (
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                    {surgery.cptCode}
                  </span>
                )}
              </div>
              
              {/* Compact metadata */}
              <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                <span>{dateDisplay}</span>
                {surgery.surgeonName && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-[120px]">{surgery.surgeonName}</span>
                  </>
                )}
                {surgery.facilityName && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-[100px]">{surgery.facilityName}</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Status and source badges */}
            <div className="flex items-center space-x-1">
              <Badge variant="outline" className={`text-xs ${getOutcomeColor(surgery.outcome)}`}>
                {surgery.outcome}
              </Badge>
              {(() => {
                const mostRecentVisit = surgery.visitHistory?.[0];
                if (mostRecentVisit) {
                  const confidence = mostRecentVisit.confidence ? Math.round(mostRecentVisit.confidence) : 0;
                  switch (mostRecentVisit.source) {
                    case "attachment":
                      return (
                        <Badge 
                          variant="outline" 
                          className="text-xs cursor-pointer hover:bg-purple-600 hover:text-white transition-colors bg-purple-50 text-purple-700 border-purple-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            const attachmentId = mostRecentVisit.attachmentId || surgery.extractedFromAttachmentId;
                            if (attachmentId) {
                              navigateWithContext(
                                `/patients/${surgery.patientId}/chart?section=attachments&highlight=${attachmentId}`,
                                'surgical-history',
                                mode
                              );
                            }
                          }}
                          title={`Doc Extract ${confidence}%`}
                        >
                          Doc {confidence}%
                        </Badge>
                      );
                    case "encounter":
                      return (
                        <Badge variant="outline" className="text-xs bg-navy-blue-50 text-navy-blue-700 border-navy-blue-200">
                          Enc {confidence}%
                        </Badge>
                      );
                    default:
                      return (
                        <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
                          Manual
                        </Badge>
                      );
                  }
                }
                return (
                  <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
                    Manual
                  </Badge>
                );
              })()}
            </div>
          </div>
          
          {/* Edit/Delete buttons (hidden in dense view for cleaner interface) */}
          {!isReadOnly && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingSurgery(surgery);
                  setEditingVisitHistory(surgery.visitHistory || []);
                }}
                title="Edit surgery"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      );
    })}
  </div>