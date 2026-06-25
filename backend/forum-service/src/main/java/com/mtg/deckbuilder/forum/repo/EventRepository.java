package com.mtg.deckbuilder.forum.repo;

import com.mtg.deckbuilder.forum.domain.Event;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface EventRepository extends MongoRepository<Event, String> {

    List<Event> findByOrderByStartsAtAsc(Pageable pageable);
}
