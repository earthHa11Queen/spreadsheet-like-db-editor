package com.matsushita.dbeditor.dto.outdto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ConflictCheckResponse {
    /** 衝突有無 */
    private boolean conflict;
}
