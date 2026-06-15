package com.mtg.deckbuilder.forum.repo;

import com.mtg.deckbuilder.forum.domain.Thread;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ThreadRepository extends MongoRepository<Thread, String> {

    List<Thread> findByOrderByLastActivityAtDesc(Pageable pageable);

    List<Thread> findByLastActivityAtLessThanOrderByLastActivityAtDesc(Instant cursor, Pageable pageable);
}
